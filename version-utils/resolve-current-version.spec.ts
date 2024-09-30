import { ProjectGraphProjectNode, Tree } from 'nx/src/devkit-exports';
import { createTreeWithEmptyWorkspace } from 'nx/src/devkit-testing-exports';
import { ManifestActions } from './flexible-version-management';
import { resolveCurrentVersion } from './resolve-current-version';

describe('resolveCurrentVersion', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  describe('disk', () => {
    class TestManifestActions extends ManifestActions {
      getPrimaryManifestPath() {
        return 'path/to/package.json';
      }
      async resolveCurrentVersion() {
        return '1.2.3';
      }
      async ensureManifestExistsAtExpectedLocation() {
        return;
      }
      async readManifestData() {
        return {
          name: 'test',
          currentVersion: '1.2.3',
          dependencies: {},
        };
      }
      async writeVersionToManifest() {
        return;
      }
      async updateDependencies() {
        return;
      }
    }

    it('should resolve the current version from disk based on the provided manifestAction instance, when currentVersionResolver is set to disk on the releaseGroup and nothing is set on the project node', async () => {
      const projectGraphNode: ProjectGraphProjectNode = {
        name: 'test',
        type: 'lib' as const,
        data: {
          root: tree.root,
        },
        // No release config, should use the releaseGroup config
      };
      const releaseGroup = {
        name: 'release-group',
        version: {
          generatorOptions: {
            currentVersionResolver: 'disk',
          },
        },
      };

      const currentVersion = await resolveCurrentVersion(
        tree,
        projectGraphNode,
        // TODO: Fix types
        releaseGroup as any,
        // TODO: Fix types
        new TestManifestActions(projectGraphNode) as any
      );
      expect(currentVersion).toBe('1.2.3');
    });

    it('should resolve the current version from disk based on the provided manifestAction instance, when currentVersionResolver is set to disk on the project node, regardless of what is set on the releaseGroup', async () => {
      const projectGraphNode: ProjectGraphProjectNode = {
        name: 'test',
        type: 'lib' as const,
        data: {
          root: tree.root,
          release: {
            version: {
              generatorOptions: {
                currentVersionResolver: 'disk',
              },
            },
          },
        },
      };
      const releaseGroup = {
        name: 'release-group',
        version: {
          generatorOptions: {
            // Should be ignored in favor of the project node
            currentVersionResolver: 'SOMETHING_ELSE',
          },
        },
      };

      const currentVersion = await resolveCurrentVersion(
        tree,
        projectGraphNode,
        // TODO: Fix types
        releaseGroup as any,
        // TODO: Fix types
        new TestManifestActions(projectGraphNode) as any
      );
      expect(currentVersion).toBe('1.2.3');
    });
  });
});
