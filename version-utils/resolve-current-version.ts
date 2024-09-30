// TODO: Fix these before merging
/* eslint-disable @nx/enforce-module-boundaries,@typescript-eslint/no-restricted-imports */
import { ReleaseGroupWithName } from 'nx/src/command-line/release/config/filter-release-groups';
import { ReleaseVersionGeneratorSchema } from 'nx/src/command-line/release/version';
import { ProjectGraphProjectNode, Tree } from 'nx/src/devkit-exports';
import { ManifestActions } from 'nxn/src/command-line/release/version-utils/flexible-version-management';

class ProjectLogger {
  constructor(private projectName: string) {}

  buffer(message: string) {
    console.log(`[${this.projectName}] ${message}`);
  }
}

export async function resolveCurrentVersion(
  tree: Tree,
  projectGraphNode: ProjectGraphProjectNode,
  releaseGroup: ReleaseGroupWithName,
  manifestActions: ManifestActions
): Promise<string> {
  const logger = new ProjectLogger(projectGraphNode.name);

  /**
   * The currentVersionResolver config can come from (in order of priority):
   * 1. An optional project level release config
   * 2. The project's releaseGroup (which will have been set appropriately  by the nx release config handler based on the global config)
   */
  let currentVersionResolver:
    | ReleaseVersionGeneratorSchema['currentVersionResolver']
    | undefined;
  let currentVersionResolverMetadata:
    | ReleaseVersionGeneratorSchema['currentVersionResolverMetadata']
    | undefined;

  if (
    projectGraphNode.data.release?.version?.generatorOptions
      ?.currentVersionResolver
  ) {
    currentVersionResolver = projectGraphNode.data.release.version
      .generatorOptions
      .currentVersionResolver as ReleaseVersionGeneratorSchema['currentVersionResolver'];
    currentVersionResolverMetadata =
      (projectGraphNode.data.release.version.generatorOptions
        .currentVersionResolverMetadata as ReleaseVersionGeneratorSchema['currentVersionResolverMetadata']) ??
      {};
  } else {
    currentVersionResolver =
      releaseGroup.version.generatorOptions.currentVersionResolver;
    currentVersionResolverMetadata =
      releaseGroup.version.generatorOptions.currentVersionResolverMetadata ??
      {};
  }

  // TODO: Remove the temp fallback once we have moved currentVersionResolver to a direct property of the release group
  if (!currentVersionResolver) {
    currentVersionResolver = 'disk';
  }

  switch (currentVersionResolver) {
    // TODO: Implement registry resolver
    case 'registry': {
      return resolveCurrentVersionFromDisk(tree, logger, manifestActions);
    }
    case 'disk': {
      return resolveCurrentVersionFromDisk(tree, logger, manifestActions);
    }
    // TODO: Implement git-tag resolver
    case 'git-tag': {
      return resolveCurrentVersionFromDisk(tree, logger, manifestActions);
    }
    default:
      throw new Error(
        `Invalid value for "currentVersionResolver": ${currentVersionResolver}`
      );
  }
}

export async function resolveCurrentVersionFromDisk(
  tree: Tree,
  logger: ProjectLogger,
  manifestActions: ManifestActions
): Promise<string> {
  const currentVersion = await manifestActions.resolveCurrentVersion(tree);
  const manifestPath = manifestActions.getPrimaryManifestPath();
  logger.buffer(
    `📄 Resolved the current version as ${currentVersion} from manifest: ${manifestPath}`
  );
  return currentVersion;
}
