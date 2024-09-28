import {
  createProjectFileMapUsingProjectGraph,
  createProjectGraphAsync,
  output,
  ProjectGraph,
  ProjectGraphProjectNode,
  readNxJson,
  readProjectsConfigurationFromProjectGraph,
  Tree,
  workspaceRoot,
} from '@nx/devkit';
import { VersionOptions } from 'nx/src/command-line/release/command-object';
import {
  createNxReleaseConfig,
  handleNxReleaseConfigError,
  NxReleaseConfig,
} from 'nx/src/command-line/release/config/config';
import { deepMergeJson } from 'nx/src/command-line/release/config/deep-merge-json';
import {
  filterReleaseGroups,
  ReleaseGroupWithName,
} from 'nx/src/command-line/release/config/filter-release-groups';
import { printConfigAndExit } from 'nx/src/command-line/release/utils/print-config';
import {
  NxReleaseVersionResult,
  VersionData,
} from 'nx/src/command-line/release/version';
import { NxReleaseConfiguration } from 'nx/src/config/nx-json';

import { releaseVersionGenerator } from '@nx/js/src/generators/release-version/release-version';
import { FsTree } from 'nx/src/generators/tree';

const validReleaseVersionPrefixes = ['auto', '', '~', '^', '='] as const;

export function createAPI(overrideReleaseConfig: NxReleaseConfiguration) {
  return async function releaseVersion(
    args: VersionOptions
  ): Promise<NxReleaseVersionResult> {
    const projectGraph = await createProjectGraphAsync({ exitOnError: true });

    const { projects } =
      readProjectsConfigurationFromProjectGraph(projectGraph);
    const nxJson = readNxJson();
    const userProvidedReleaseConfig = deepMergeJson(
      nxJson.release ?? {},
      overrideReleaseConfig ?? {}
    );

    // Apply default configuration to any optional user configuration
    const { error: configError, nxReleaseConfig } = await createNxReleaseConfig(
      projectGraph,
      await createProjectFileMapUsingProjectGraph(projectGraph),
      userProvidedReleaseConfig
    );
    if (configError) {
      return await handleNxReleaseConfigError(configError);
    }
    // --print-config exits directly as it is not designed to be combined with any other programmatic operations
    if (args.printConfig) {
      return printConfigAndExit({
        userProvidedReleaseConfig,
        nxReleaseConfig,
        isDebug: args.printConfig === 'debug',
      });
    }

    let {
      error: filterError,
      releaseGroups,
      releaseGroupToFilteredProjects,
    } = filterReleaseGroups(
      projectGraph,
      nxReleaseConfig,
      args.projects,
      args.groups
    );
    if (filterError) {
      output.error(filterError);
      process.exit(1);
    }

    console.log({ nxReleaseConfig });

    const tree = new FsTree(workspaceRoot, args.verbose);

    const versionData: VersionData = {};

    // Create a graph of the release groups
    const releaseGroupGraph = createReleaseGroupGraph(
      projectGraph,
      releaseGroupToFilteredProjects,
      releaseGroups
    );

    // releaseGroups = [releaseGroups[0]];

    for (const releaseGroup of releaseGroups) {
      const releaseGroupName = releaseGroup.name;
      const releaseGroupProjectNames = Array.from(
        releaseGroupToFilteredProjects.get(releaseGroup)
      );
      console.log({ releaseGroupName, releaseGroupProjectNames });

      const releaseVersionGeneratorSchema: ReleaseVersionGeneratorSchema = {
        projects: releaseGroupProjectNames.map(
          (name) => projectGraph.nodes[name]
        ),
        releaseGroup,
        projectGraph,
        currentVersionResolver: 'disk',
        specifierSource: 'prompt',
        specifier: '100.1.0',
      };

      const res = await releaseVersionGenerator(
        tree,
        releaseVersionGeneratorSchema
      );
      console.log({ res });
    }

    return {
      workspaceVersion: '1.0.0',
      projectsVersionData: {},
    };
  };
}

interface ReleaseVersionGeneratorSchema {
  // start: internal props
  // The projects being versioned in the current execution
  projects: ProjectGraphProjectNode[];
  releaseGroup: ReleaseGroupWithName;
  projectGraph: ProjectGraph;
  conventionalCommitsConfig?: NxReleaseConfig['conventionalCommits'];
  firstRelease?: boolean;
  deleteVersionPlans?: boolean;
  // end: internal props

  specifier?: string;
  specifierSource?: 'prompt' | 'conventional-commits' | 'version-plans';
  preid?: string;
  packageRoot?: string;
  currentVersionResolver?: 'registry' | 'disk' | 'git-tag';
  currentVersionResolverMetadata?: Record<string, unknown>;
  fallbackCurrentVersionResolver?: 'disk';
  // auto means the existing prefix will be preserved, and is the default behavior
  versionPrefix?: (typeof validReleaseVersionPrefixes)[number];
  skipLockFileUpdate?: boolean;
  installArgs?: string;
  installIgnoreScripts?: boolean;
  /**
   * 'auto' allows users to opt into dependents being updated (a patch version bump) when a dependency is versioned.
   * This is only applicable to independently released projects.
   */
  updateDependents?: 'never' | 'auto';
  /**
   * Whether or not to completely omit project logs when that project has no applicable changes. This can be useful for
   * large monorepos which have a large number of projects, especially when only a subset are released together.
   */
  logUnchangedProjects?: boolean;
  /**
   * Whether or not to keep local dependency protocols (e.g. file:, workspace:) when updating dependencies in
   * package.json files. This is `false` by default as not all package managers support publishing with these protocols
   * still present in the package.json.
   */
  preserveLocalDependencyProtocols?: boolean;
}

// async function releaseVersionGenerator(
//   tree: Tree,
//   options: ReleaseVersionGeneratorSchema
// ) {}

function createReleaseGroupGraph(
  projectGraph: ProjectGraph,
  releaseGroupToFilteredProjects: Map<ReleaseGroupWithName, Set<string>>,
  allReleaseGroups: ReleaseGroupWithName[]
) {
  // We don't have any existing utils for this, so we'll just do it manually
  const graph: Record<string, string[]> = {};

  // The way we figure out if there are dependencies between groups is if a project in one group depends on a project in another group
  for (const releaseGroup of allReleaseGroups) {
    const releaseGroupProjectNames = Array.from(
      releaseGroupToFilteredProjects.get(releaseGroup)
    );

    for (const projectName of releaseGroupProjectNames) {
      const project = projectGraph.nodes[projectName];
      const projectDependencies = projectGraph.dependencies[projectName];

      for (const projectDependency of projectDependencies) {
        const dependencyProjectName = projectDependency.target;
        const dependencyProject = projectGraph.nodes[dependencyProjectName];
        const dependencyProjectReleaseGroup = allReleaseGroups.find((group) =>
          Array.from(releaseGroupToFilteredProjects.get(group)).includes(
            dependencyProjectName
          )
        );

        if (dependencyProjectReleaseGroup) {
          graph[releaseGroup.name] = [
            ...(graph[releaseGroup.name] ?? []),
            dependencyProjectReleaseGroup.name,
          ];
        }
      }
    }
  }
  console.log({ graph });
  return graph;
}
