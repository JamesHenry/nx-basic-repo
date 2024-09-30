// TODO: Fix these before merging
/* eslint-disable @nx/enforce-module-boundaries,@typescript-eslint/no-restricted-imports */
import {
  ProjectGraphProjectNode,
  readJson,
  Tree,
  updateJson,
} from 'nx/src/devkit-exports';
import { join } from 'node:path';
import { ReleaseGroupWithName } from 'nx/src/command-line/release/config/filter-release-groups';
import { deriveNewSemverVersion } from 'nx/src/command-line/release/utils/semver';

export type SpecifierSource =
  | 'prompt'
  | 'conventional-commits'
  | 'version-plans';
export type SemverBumpType = 'major' | 'minor' | 'patch' | 'none';
export type SideEffectBumpType = SemverBumpType | 'same-as-dependency';

// TODO: Implement this
export function deriveSpecifierFromGit(projectName: string): SemverBumpType {
  return 'patch';
}

// TODO: Implement this
export function deriveSpecifierFromVersionPlan(
  projectPath: string
): SemverBumpType {
  return 'patch';
}

export async function resolveManifestActionsForProject(
  tree: Tree,
  releaseGroup: ReleaseGroupWithName,
  projectGraphNode: ProjectGraphProjectNode
): Promise<ManifestActions> {
  // Project level "release" config takes priority
  // TODO: Update release config type to include manifestActions
  if (
    typeof (projectGraphNode.data.release as any)?.manifestActions === 'string'
  ) {
    const ManifestActionsClass = require((projectGraphNode.data.release as any)
      .manifestActions);
    const manifestActions = new ManifestActionsClass(projectGraphNode);
    await manifestActions.ensureManifestExistsAtExpectedLocation(tree);
    return manifestActions;
  }

  // Then release group level
  if (typeof (releaseGroup as any).manifestActions === 'string') {
    const ManifestActionsClass = require((releaseGroup as any).manifestActions);
    const manifestActions = new ManifestActionsClass(projectGraphNode);
    await manifestActions.ensureManifestExistsAtExpectedLocation(tree);
    return manifestActions;
  }

  // Otherwise, default to the JS implementation
  const manifestActions = new JsManifestActions(projectGraphNode);
  await manifestActions.ensureManifestExistsAtExpectedLocation(tree);
  return manifestActions;
}

export type ManifestData = {
  name: string;
  currentVersion: string;
  dependencies: Record<string, Record<string, string>>;
};

export abstract class ManifestActions {
  protected initialManifestData: ManifestData | null = null;

  constructor(protected projectGraphNode: ProjectGraphProjectNode) {}

  /**
   * Implementation details of resolving a project's manifest file,
   * such as a package.json/Cargo.toml/etc, from disk.
   */
  abstract readManifestData(tree: Tree): Promise<ManifestData>;

  /**
   * Implementation details of writing a newly derived version to a project's
   * manifest file, such as a package.json/Cargo.toml/etc.
   */
  abstract writeVersionToManifest(
    tree: Tree,
    newVersion: string
  ): Promise<void>;

  /**
   * Implementation details of updating a project's manifest file,
   * such as a package.json/Cargo.toml/etc, with new dependency versions.
   */
  abstract updateDependencies(
    tree: Tree,
    dependenciesToUpdate: Record<string, string>
  ): Promise<void>;

  /**
   * Implementation details of ensuring that the manifest file exists at the expected location,
   * will be invoked immediately after resolving the manifest actions for a particular project.
   */
  abstract ensureManifestExistsAtExpectedLocation(tree: Tree): Promise<void>;

  /**
   * Reads and caches the initial manifest data.
   */
  async getInitialManifestData(tree: Tree): Promise<ManifestData> {
    if (!this.initialManifestData) {
      this.initialManifestData = await this.readManifestData(tree);
    }
    return this.initialManifestData;
  }

  async determineSemverVersion(
    tree: Tree,
    bumpType: SemverBumpType
  ): Promise<string> {
    const manifestData = await this.getInitialManifestData(tree);
    // TODO: Support preid
    return deriveNewSemverVersion(manifestData.currentVersion, bumpType);
  }
}

export class JsManifestActions extends ManifestActions {
  async ensureManifestExistsAtExpectedLocation(tree: Tree) {
    const packageJsonPath = join(
      this.projectGraphNode.data.root,
      'package.json'
    );
    if (!tree.exists(packageJsonPath)) {
      throw new Error(
        `The project "${this.projectGraphNode.name}" does not have a package.json available at ${packageJsonPath}.

To fix this you will either need to add a package.json file at that location, or configure "release" within your nx.json to exclude "${this.projectGraphNode.name}" from the current release group, or amend the packageRoot configuration to point to where the package.json should be.`
      );
    }
  }

  async readManifestData(tree: Tree): Promise<ManifestData> {
    const packageJson = readJson(
      tree,
      join(this.projectGraphNode.data.root, 'package.json')
    );
    const dependencies = this.parseDependencies(packageJson);
    return {
      name: packageJson.name,
      currentVersion: packageJson.version,
      dependencies,
    };
  }

  async writeVersionToManifest(tree: Tree, newVersion: string) {
    updateJson(
      tree,
      join(this.projectGraphNode.data.root, 'package.json'),
      (json) => {
        json.version = newVersion;
        return json;
      }
    );
  }

  async updateDependencies(
    tree: Tree,
    dependenciesToUpdate: Record<string, string>
  ) {
    updateJson(
      tree,
      join(this.projectGraphNode.data.root, 'package.json'),
      (json) => {
        const dependencyTypes = [
          'dependencies',
          'devDependencies',
          'peerDependencies',
          'optionalDependencies',
        ];

        for (const depType of dependencyTypes) {
          if (json[depType]) {
            for (const [dep, version] of Object.entries(dependenciesToUpdate)) {
              if (json[depType][dep]) {
                json[depType][dep] = version;
              }
            }
          }
        }

        return json;
      }
    );
  }

  private parseDependencies(
    packageJson: any
  ): Record<string, Record<string, string>> {
    // TODO: Refactor this so that the whole JS manifest actions is dynamically loaded from @nx/js
    const {
      resolveVersionSpec,
      // nx-ignore-next-line
    } = require('@nx/js/src/generators/release-version/utils/resolve-version-spec');

    const result: Record<string, Record<string, string>> = {};
    const dependencyTypes = [
      'dependencies',
      'devDependencies',
      'peerDependencies',
      'optionalDependencies',
    ];

    for (const depType of dependencyTypes) {
      if (packageJson[depType]) {
        result[depType] = {};
        for (const [dep, spec] of Object.entries(packageJson[depType])) {
          const resolvedSpec = resolveVersionSpec(
            dep,
            packageJson.version,
            spec as string,
            this.projectGraphNode.data.root
          );
          result[depType][dep] = resolvedSpec;
        }
      }
    }

    return result;
  }
}
