// TODO: Fix these before merging
/* eslint-disable @nx/enforce-module-boundaries,@typescript-eslint/no-restricted-imports */
import { readJson, Tree, updateJson } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { JsManifestActions } from './flexible-version-management';
import {
  createNxReleaseConfigAndPopulateWorkspace,
  ExampleRustManifestActions,
} from './test-utils';

let mockDeriveSpecifierFromGit = jest.fn();
let mockDeriveSpecifierFromVersionPlan = jest.fn();
let mockResolveManifestActionsForProject = jest.fn();

jest.doMock('./flexible-version-management', () => ({
  ...jest.requireActual('./flexible-version-management'),
  deriveSpecifierFromGit: mockDeriveSpecifierFromGit,
  deriveSpecifierFromVersionPlan: mockDeriveSpecifierFromVersionPlan,
  resolveManifestActionsForProject: mockResolveManifestActionsForProject,
}));

// This does not work with the mocking if we use import
const { ReleaseGroupProcessor } = require('./release-group-processor') as {
  ReleaseGroupProcessor: typeof import('./release-group-processor').ReleaseGroupProcessor;
};

// Using the daemon in unit tests would cause jest to never exit
process.env.NX_DAEMON = 'false';

describe('ReleaseGroupProcessor', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    updateJson(tree, 'nx.json', (json) => {
      json.release = {};
      return json;
    });

    mockResolveManifestActionsForProject.mockImplementation(
      async (tree, releaseGroup, projectGraphNode) => {
        const exampleRustManifestActions = '__EXAMPLE_RUST_MANIFEST_ACTIONS__';
        // Project level
        if (
          projectGraphNode.data.release?.manifestActions ===
          exampleRustManifestActions
        ) {
          const manifestActions = new ExampleRustManifestActions(
            projectGraphNode
          );
          await manifestActions.ensureManifestExistsAtExpectedLocation(tree);
          return manifestActions;
        }
        // Release group level
        if (releaseGroup.manifestActions === exampleRustManifestActions) {
          const manifestActions = new ExampleRustManifestActions(
            projectGraphNode
          );
          await manifestActions.ensureManifestExistsAtExpectedLocation(tree);
          return manifestActions;
        }
        // Default to JS implementation
        const manifestActions = new JsManifestActions(projectGraphNode);
        await manifestActions.ensureManifestExistsAtExpectedLocation(tree);
        return manifestActions;
      }
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it('should handle a single default group with fixed versioning, with no project dependency relationships', async () => {
    const { nxReleaseConfig, projectGraph, releaseGroups } =
      await createNxReleaseConfigAndPopulateWorkspace(
        tree,
        `
          __default__ ({ "projectsRelationship": "fixed" }):
            - projectA@1.0.0 [js]
            - projectB@1.0.0 [js]
            - projectC@1.0.0 [js]
        `,
        {
          version: {
            conventionalCommits: true,
          },
        }
      );

    const processor = new ReleaseGroupProcessor(
      tree,
      projectGraph,
      nxReleaseConfig,
      releaseGroups
    );
    await processor.buildGroupGraph();

    mockDeriveSpecifierFromGit.mockImplementation(() => {
      // This should only be called once for this group (for the first project)
      return 'minor';
    });
    await processor.processGroups();

    // All projects should be bumped to the same version as required by the first project
    expect(mockDeriveSpecifierFromGit).toHaveBeenCalledTimes(1);
    expect(readJson(tree, 'projectA/package.json')).toMatchInlineSnapshot(`
      {
        "name": "projectA",
        "version": "1.1.0",
      }
    `);
    expect(readJson(tree, 'projectB/package.json')).toMatchInlineSnapshot(`
      {
        "name": "projectB",
        "version": "1.1.0",
      }
    `);
    expect(readJson(tree, 'projectC/package.json')).toMatchInlineSnapshot(`
      {
        "name": "projectC",
        "version": "1.1.0",
      }
    `);
  });

  it('should handle a single default group with fixed versioning, with project dependency relationships', async () => {
    const { nxReleaseConfig, projectGraph, releaseGroups } =
      await createNxReleaseConfigAndPopulateWorkspace(
        tree,
        `
          __default__ ({ "projectsRelationship": "fixed" }):
            - projectD@1.0.0 [js]
              -> depends on projectE
            - projectE@1.0.0 [js]
              -> depends on projectF
            - projectF@1.0.0 [js]
        `,
        {
          version: {
            conventionalCommits: true,
          },
        }
      );

    const processor = new ReleaseGroupProcessor(
      tree,
      projectGraph,
      nxReleaseConfig,
      releaseGroups
    );
    await processor.buildGroupGraph();

    mockDeriveSpecifierFromGit.mockImplementation(() => {
      // This should only be called once for this group (for the first project)
      return 'minor';
    });
    await processor.processGroups();

    // All projects should be bumped to the same version as required by the first project (the project dependency relationships do not affect this)
    expect(mockDeriveSpecifierFromGit).toHaveBeenCalledTimes(1);
    expect(readJson(tree, 'projectD/package.json')).toMatchInlineSnapshot(`
      {
        "dependencies": {
          "projectE": "1.1.0",
        },
        "name": "projectD",
        "version": "1.1.0",
      }
    `);
    expect(readJson(tree, 'projectE/package.json')).toMatchInlineSnapshot(`
      {
        "dependencies": {
          "projectF": "1.1.0",
        },
        "name": "projectE",
        "version": "1.1.0",
      }
    `);
    expect(readJson(tree, 'projectF/package.json')).toMatchInlineSnapshot(`
      {
        "name": "projectF",
        "version": "1.1.0",
      }
    `);
  });

  it('should handle a single default group with independent versioning, with no project dependency relationships', async () => {
    const { nxReleaseConfig, projectGraph, releaseGroups } =
      await createNxReleaseConfigAndPopulateWorkspace(
        tree,
        `
          __default__ ({ "projectsRelationship": "independent" }):
            - projectG@1.0.0 [js]
            - projectH@2.0.0 [js]
            - projectI@3.0.0 [js]
        `,
        {
          version: {
            conventionalCommits: true,
          },
        }
      );

    const processor = new ReleaseGroupProcessor(
      tree,
      projectGraph,
      nxReleaseConfig,
      releaseGroups
    );

    await processor.buildGroupGraph();

    mockDeriveSpecifierFromGit.mockImplementation((projectName) => {
      if (projectName === 'projectG') return 'minor';
      if (projectName === 'projectH') return 'patch';
      return 'none';
    });
    await processor.processGroups();

    // Each project should have its own specifier independently resolved
    expect(mockDeriveSpecifierFromGit).toHaveBeenCalledTimes(3);

    // The new versions are based on the individually derived specifiers and previous versions
    expect(readJson(tree, 'projectG/package.json')).toMatchInlineSnapshot(`
      {
        "name": "projectG",
        "version": "1.1.0",
      }
    `);
    expect(readJson(tree, 'projectH/package.json')).toMatchInlineSnapshot(`
      {
        "name": "projectH",
        "version": "2.0.1",
      }
    `);
    expect(readJson(tree, 'projectI/package.json')).toMatchInlineSnapshot(`
      {
        "name": "projectI",
        "version": "3.0.0",
      }
    `);
  });

  describe('independent group with project dependency relationships within it', () => {
    let processor: import('./release-group-processor').ReleaseGroupProcessor;
    let tree: Tree;

    // Share a tree, project graph and release groups setup between these tests
    beforeEach(async () => {
      tree = createTreeWithEmptyWorkspace();
      const { nxReleaseConfig, projectGraph, releaseGroups } =
        await createNxReleaseConfigAndPopulateWorkspace(
          tree,
          `
          __default__ ({ "projectsRelationship": "independent" }):
            - projectJ@1.0.0 [js]
              -> depends on projectK
            - projectK@2.0.0 [js]
              -> depends on projectL
            - projectL@3.0.0 [js]
        `,
          {
            version: {
              conventionalCommits: true,
            },
          }
        );

      processor = new ReleaseGroupProcessor(
        tree,
        projectGraph,
        nxReleaseConfig,
        releaseGroups
      );
      await processor.buildGroupGraph();
    });

    it('should not bump anything when no specifiers are resolved', async () => {
      mockDeriveSpecifierFromGit.mockImplementation(() => {
        return 'none';
      });
      await processor.processGroups();

      // Called for each project
      expect(mockDeriveSpecifierFromGit).toHaveBeenCalledTimes(3);

      // All projects unchanged
      expect(readJson(tree, 'projectJ/package.json')).toMatchInlineSnapshot(`
        {
          "dependencies": {
            "projectK": "2.0.0",
          },
          "name": "projectJ",
          "version": "1.0.0",
        }
      `);
      expect(readJson(tree, 'projectK/package.json')).toMatchInlineSnapshot(`
        {
          "dependencies": {
            "projectL": "3.0.0",
          },
          "name": "projectK",
          "version": "2.0.0",
        }
      `);
      expect(readJson(tree, 'projectL/package.json')).toMatchInlineSnapshot(`
        {
          "name": "projectL",
          "version": "3.0.0",
        }
      `);
    });

    it('should only bump projects based on their own specifiers if no dependencies have resolved specifiers', async () => {
      mockDeriveSpecifierFromGit.mockImplementation((projectName) => {
        // Only projectJ has a specifier, it is not depended on by anything else
        if (projectName === 'projectJ') return 'minor';
        return 'none';
      });
      await processor.processGroups();

      // Called for each project
      expect(mockDeriveSpecifierFromGit).toHaveBeenCalledTimes(3);

      // Only projectJ is bumped
      expect(readJson(tree, 'projectJ/package.json')).toMatchInlineSnapshot(`
        {
          "dependencies": {
            "projectK": "2.0.0",
          },
          "name": "projectJ",
          "version": "1.1.0",
        }
      `);
      expect(readJson(tree, 'projectK/package.json')).toMatchInlineSnapshot(`
        {
          "dependencies": {
            "projectL": "3.0.0",
          },
          "name": "projectK",
          "version": "2.0.0",
        }
      `);
      expect(readJson(tree, 'projectL/package.json')).toMatchInlineSnapshot(`
        {
          "name": "projectL",
          "version": "3.0.0",
        }
      `);
    });

    it('should handle projects with mixed dependency types', async () => {
      const { nxReleaseConfig, projectGraph, releaseGroups } =
        await createNxReleaseConfigAndPopulateWorkspace(
          tree,
          `
            __default__ ({ "projectsRelationship": "independent" }):
              - projectM@1.0.0 [js]
                -> depends on projectN
                -> depends on projectO {devDependencies}
                -> depends on projectP {peerDependencies}
              - projectN@1.0.0 [js]
              - projectO@1.0.0 [js]
              - projectP@1.0.0 [js]
          `,
          {
            version: {
              conventionalCommits: true,
            },
          }
        );

      const processor = new ReleaseGroupProcessor(
        tree,
        projectGraph,
        nxReleaseConfig,
        releaseGroups
      );

      await processor.buildGroupGraph();

      mockDeriveSpecifierFromGit.mockImplementation((projectName) => {
        if (projectName === 'projectM') return 'minor';
        if (projectName === 'projectN') return 'patch';
        if (projectName === 'projectO') return 'major';
        return 'none';
      });
      await processor.processGroups();

      // projectM is bumped by minor, and its dependencies are updated accordingly
      expect(readJson(tree, 'projectM/package.json')).toMatchInlineSnapshot(`
        {
          "dependencies": {
            "projectN": "1.0.1",
          },
          "devDependencies": {
            "projectO": "2.0.0",
          },
          "name": "projectM",
          "peerDependencies": {
            "projectP": "1.0.0",
          },
          "version": "1.1.0",
        }
      `);
      // projectN is bumped by patch
      expect(readJson(tree, 'projectN/package.json')).toMatchInlineSnapshot(`
        {
          "name": "projectN",
          "version": "1.0.1",
        }
      `);
      // projectO is bumped by major
      expect(readJson(tree, 'projectO/package.json')).toMatchInlineSnapshot(`
        {
          "name": "projectO",
          "version": "2.0.0",
        }
      `);
      // projectP is not bumped
      expect(readJson(tree, 'projectP/package.json')).toMatchInlineSnapshot(`
        {
          "name": "projectP",
          "version": "1.0.0",
        }
      `);
    });

    describe('mixed ecosystems', () => {
      it('should handle a single fixed group containing both rust and js projects with separate dependency relationships', async () => {
        const { nxReleaseConfig, projectGraph, releaseGroups } =
          await createNxReleaseConfigAndPopulateWorkspace(
            tree,
            `
              __default__ ({ "projectsRelationship": "fixed" }):
                - rustLibA@1.0.0 [rust]
                - rustLibB@1.0.0 [rust]
                  -> depends on rustLibA
                - jsPackageX@1.0.0 [js]
                - jsPackageY@1.0.0 [js]
                  -> depends on jsPackageX
            `,
            {
              version: {
                conventionalCommits: true,
              },
            }
          );

        // Initial state of rustLibA
        expect(tree.read('rustLibA/Cargo.toml', 'utf-8'))
          .toMatchInlineSnapshot(`
          "
          [package]
          name = 'rustLibA'
          version = '1.0.0'
          "
        `);

        // Initial state of rustLibB
        expect(tree.read('rustLibB/Cargo.toml', 'utf-8'))
          .toMatchInlineSnapshot(`
          "
          [package]
          name = 'rustLibB'
          version = '1.0.0'

          [dependencies]
          rustLibA = { version = '1.0.0' }
          "
        `);

        const processor = new ReleaseGroupProcessor(
          tree,
          projectGraph,
          nxReleaseConfig,
          releaseGroups
        );
        await processor.buildGroupGraph();

        mockDeriveSpecifierFromGit.mockImplementation(() => {
          // This should only be called once for this group (for the first project)
          return 'minor';
        });
        await processor.processGroups();

        // All projects should be bumped to the same version as required by the first project
        expect(mockDeriveSpecifierFromGit).toHaveBeenCalledTimes(1);

        // rustLibA is bumped by minor
        expect(tree.read('rustLibA/Cargo.toml', 'utf-8'))
          .toMatchInlineSnapshot(`
          "
          [package]
          name = 'rustLibA'
          version = '1.1.0'
          "
        `);

        // rustLibB is bumped by minor, and its dependency on rustLibA is updated
        expect(tree.read('rustLibB/Cargo.toml', 'utf-8'))
          .toMatchInlineSnapshot(`
          "
          [package]
          name = 'rustLibB'
          version = '1.1.0'

          [dependencies]
          rustLibA = '1.1.0'
          "
        `);

        // jsPackageX is bumped by minor
        expect(readJson(tree, 'jsPackageX/package.json'))
          .toMatchInlineSnapshot(`
          {
            "name": "jsPackageX",
            "version": "1.1.0",
          }
        `);

        // jsPackageY is bumped by minor, and its dependency on jsPackageX is updated
        expect(readJson(tree, 'jsPackageY/package.json'))
          .toMatchInlineSnapshot(`
          {
            "dependencies": {
              "jsPackageX": "1.1.0",
            },
            "name": "jsPackageY",
            "version": "1.1.0",
          }
        `);
      });

      it('should handle a single independent group containing both rust and js projects with separate dependency relationships', async () => {
        const { nxReleaseConfig, projectGraph, releaseGroups } =
          await createNxReleaseConfigAndPopulateWorkspace(
            tree,
            `
              __default__ ({ "projectsRelationship": "independent" }):
                - rustLibA@1.0.0 [rust]
                - rustLibB@2.0.0 [rust]
                  -> depends on rustLibA
                - jsPackageX@3.0.0 [js]
                - jsPackageY@4.0.0 [js]
                  -> depends on jsPackageX
            `,
            {
              version: {
                conventionalCommits: true,
              },
            }
          );

        // Initial state of rustLibA
        expect(tree.read('rustLibA/Cargo.toml', 'utf-8'))
          .toMatchInlineSnapshot(`
          "
          [package]
          name = 'rustLibA'
          version = '1.0.0'
          "
        `);

        // Initial state of rustLibB
        expect(tree.read('rustLibB/Cargo.toml', 'utf-8'))
          .toMatchInlineSnapshot(`
          "
          [package]
          name = 'rustLibB'
          version = '2.0.0'

          [dependencies]
          rustLibA = { version = '1.0.0' }
          "
        `);

        const processor = new ReleaseGroupProcessor(
          tree,
          projectGraph,
          nxReleaseConfig,
          releaseGroups
        );
        await processor.buildGroupGraph();

        mockDeriveSpecifierFromGit.mockImplementation((projectName) => {
          if (projectName === 'rustLibA') return 'minor';
          if (projectName === 'rustLibB') return 'patch';
          if (projectName === 'jsPackageX') return 'major';
          if (projectName === 'jsPackageY') return 'minor';
          return 'none';
        });
        await processor.processGroups();

        // Called for each project
        expect(mockDeriveSpecifierFromGit).toHaveBeenCalledTimes(4);

        // rustLibA is bumped by minor
        expect(tree.read('rustLibA/Cargo.toml', 'utf-8'))
          .toMatchInlineSnapshot(`
          "
          [package]
          name = 'rustLibA'
          version = '1.1.0'
          "
        `);

        // rustLibB is bumped by updateDependents default of "patch", and its dependency on rustLibA is updated
        expect(tree.read('rustLibB/Cargo.toml', 'utf-8'))
          .toMatchInlineSnapshot(`
          "
          [package]
          name = 'rustLibB'
          version = '2.0.1'

          [dependencies]
          rustLibA = '1.1.0'
          "
        `);

        // jsPackageX is bumped by major
        expect(readJson(tree, 'jsPackageX/package.json'))
          .toMatchInlineSnapshot(`
          {
            "name": "jsPackageX",
            "version": "4.0.0",
          }
        `);

        // jsPackageY is bumped by minor, and its dependency on jsPackageX is updated
        expect(readJson(tree, 'jsPackageY/package.json'))
          .toMatchInlineSnapshot(`
          {
            "dependencies": {
              "jsPackageX": "4.0.0",
            },
            "name": "jsPackageY",
            "version": "4.1.0",
          }
        `);
      });
    });

    describe('updateDependents', () => {
      it('should bump projects if their dependencies have resolved specifiers, even when they have not resolved their own specifiers, when generatorOptions.updateDependents is set to its default of "auto" - SINGLE LEVEL DEPENDENCY', async () => {
        mockDeriveSpecifierFromGit.mockImplementation((projectName) => {
          // Only projectK has a specifier. This should cause both itself and projectJ to be bumped.
          if (projectName === 'projectK') return 'minor';
          return 'none';
        });
        await processor.processGroups();

        // Called for each project
        expect(mockDeriveSpecifierFromGit).toHaveBeenCalledTimes(3);

        // projectJ is bumped by the default updateDependents bump of "patch"
        expect(readJson(tree, 'projectJ/package.json')).toMatchInlineSnapshot(`
          {
            "dependencies": {
              "projectK": "2.1.0",
            },
            "name": "projectJ",
            "version": "1.0.1",
          }
        `);
        // projectK is bumped based on its own specifier of minor
        expect(readJson(tree, 'projectK/package.json')).toMatchInlineSnapshot(`
          {
            "dependencies": {
              "projectL": "3.0.0",
            },
            "name": "projectK",
            "version": "2.1.0",
          }
        `);
        // projectL is not bumped because it has no specifier and does not depend on projects that do
        expect(readJson(tree, 'projectL/package.json')).toMatchInlineSnapshot(`
          {
            "name": "projectL",
            "version": "3.0.0",
          }
        `);
      });

      it('should bump projects if their dependencies have resolved specifiers, even when they have not resolved their own specifiers, when generatorOptions.updateDependents is set to its default of "auto" - TRANSITIVE DEPENDENCY', async () => {
        // This time bump projectL which should cause a cascade of bumps across projectK and projectJ
        mockDeriveSpecifierFromGit.mockImplementation((projectName) => {
          // Only projectL has a specifier. This should cause itself to be bumped by a major, and projectK and projectJ to be bumped by a patch.
          if (projectName === 'projectL') return 'major';
          return 'none';
        });
        await processor.processGroups();

        // Called for each project
        expect(mockDeriveSpecifierFromGit).toHaveBeenCalledTimes(3);

        // projectJ is bumped by the default updateDependents bump of "patch"
        expect(readJson(tree, 'projectJ/package.json')).toMatchInlineSnapshot(`
          {
            "dependencies": {
              "projectK": "2.0.1",
            },
            "name": "projectJ",
            "version": "1.0.1",
          }
        `);
        // projectK is bumped by the default updateDependents bump of "patch"
        expect(readJson(tree, 'projectK/package.json')).toMatchInlineSnapshot(`
          {
            "dependencies": {
              "projectL": "4.0.0",
            },
            "name": "projectK",
            "version": "2.0.1",
          }
        `);
        // projectL is bumped by a major
        expect(readJson(tree, 'projectL/package.json')).toMatchInlineSnapshot(`
          {
            "name": "projectL",
            "version": "4.0.0",
          }
        `);
      });

      it('should bump projects if their dependencies have resolved specifiers, even when they have not resolved their own specifiers, when generatorOptions.updateDependents is set to its default of "auto" - TRANSITIVE DEPENDENCY MANY LEVELS AWAY', async () => {
        const { nxReleaseConfig, projectGraph, releaseGroups } =
          await createNxReleaseConfigAndPopulateWorkspace(
            tree,
            `
          __default__ ({ "projectsRelationship": "independent" }):
            - projectJ@1.0.0 [js]
              -> depends on projectK {devDependencies}
            - projectK@2.0.0 [js]
              -> depends on projectL {optionalDependencies}
            - projectL@3.0.0 [js]
              -> depends on projectM {dependencies}
            - projectM@4.0.0 [js]
              -> depends on projectN {peerDependencies}
            - projectN@5.0.0 [js]
              -> depends on projectO {dependencies}
            - projectO@6.0.0 [js]
        `,
            {
              version: {
                conventionalCommits: true,
              },
            }
          );

        processor = new ReleaseGroupProcessor(
          tree,
          projectGraph,
          nxReleaseConfig,
          releaseGroups
        );
        await processor.buildGroupGraph();

        mockDeriveSpecifierFromGit.mockImplementation((projectName) => {
          // only projectO has a specifier, all other projects have no specifier but should be bumped as a cascading side effect
          if (projectName === 'projectO') return 'major';
          return 'none';
        });
        await processor.processGroups();

        // Called for each project
        expect(mockDeriveSpecifierFromGit).toHaveBeenCalledTimes(6);

        // projectJ is bumped because of its dependency on projectK
        expect(readJson(tree, 'projectJ/package.json')).toMatchInlineSnapshot(`
          {
            "devDependencies": {
              "projectK": "2.0.1",
            },
            "name": "projectJ",
            "version": "1.0.1",
          }
        `);
        // projectK is bumped because of its dependency on projectL
        expect(readJson(tree, 'projectK/package.json')).toMatchInlineSnapshot(`
          {
            "name": "projectK",
            "optionalDependencies": {
              "projectL": "3.0.1",
            },
            "version": "2.0.1",
          }
        `);
        // projectL is bumped because of its dependency on projectM
        expect(readJson(tree, 'projectL/package.json')).toMatchInlineSnapshot(`
          {
            "dependencies": {
              "projectM": "4.0.1",
            },
            "name": "projectL",
            "version": "3.0.1",
          }
        `);
        // projectM is bumped because of its dependency on projectN
        expect(readJson(tree, 'projectM/package.json')).toMatchInlineSnapshot(`
          {
            "name": "projectM",
            "peerDependencies": {
              "projectN": "5.0.1",
            },
            "version": "4.0.1",
          }
        `);
        // projectN is bumped because of its dependency on projectO
        expect(readJson(tree, 'projectN/package.json')).toMatchInlineSnapshot(`
          {
            "dependencies": {
              "projectO": "7.0.0",
            },
            "name": "projectN",
            "version": "5.0.1",
          }
        `);
        // projectO is bumped because of its own specifier of major
        expect(readJson(tree, 'projectO/package.json')).toMatchInlineSnapshot(`
          {
            "name": "projectO",
            "version": "7.0.0",
          }
        `);
      });

      it('should bump projects by the maximum of their own specifier and the updateDependents bump but not both, when generatorOptions.updateDependents is set to its default of "auto"', async () => {
        mockDeriveSpecifierFromGit.mockImplementation((projectName) => {
          // projectL has a specifier, this will cause projectK and projectJ to need to be bumped.
          if (projectName === 'projectL') return 'major';
          // projectK has its own specifier which is higher than the default updateDependents bump of "patch", so this is what should be applied
          if (projectName === 'projectK') return 'minor';
          // projectJ also has its own specifier which is higher than the default updateDependents bump of "patch", so this is what should be applied
          if (projectName === 'projectJ') return 'major';
          return 'none';
        });
        await processor.processGroups();

        // Called for each project
        expect(mockDeriveSpecifierFromGit).toHaveBeenCalledTimes(3);

        // projectJ is bumped based on its own specifier of major, the patch bump from updateDependents is not applied on top
        expect(readJson(tree, 'projectJ/package.json')).toMatchInlineSnapshot(`
          {
            "dependencies": {
              "projectK": "2.1.0",
            },
            "name": "projectJ",
            "version": "2.0.0",
          }
        `);
        // projectK is bumped based on its own specifier of minor, the patch bump from updateDependents is not applied on top
        expect(readJson(tree, 'projectK/package.json')).toMatchInlineSnapshot(`
          {
            "dependencies": {
              "projectL": "4.0.0",
            },
            "name": "projectK",
            "version": "2.1.0",
          }
        `);
        // projectL gets a major bump via its own specifier
        expect(readJson(tree, 'projectL/package.json')).toMatchInlineSnapshot(`
          {
            "name": "projectL",
            "version": "4.0.0",
          }
        `);
      });

      it('should not bump dependents if their dependencies have resolved specifiers, if generatorOptions.updateDependents is set to "never" - SINGLE LEVEL DEPENDENCY', async () => {
        const { nxReleaseConfig, projectGraph, releaseGroups } =
          await createNxReleaseConfigAndPopulateWorkspace(
            tree,
            `
          __default__ ({ "projectsRelationship": "independent" }):
            - projectJ@1.0.0 [js]
              -> depends on projectK
            - projectK@2.0.0 [js]
              -> depends on projectL
            - projectL@3.0.0 [js]
        `,
            {
              version: {
                conventionalCommits: true,
                // TODO: Move this to top level option
                generatorOptions: {
                  updateDependents: 'never',
                },
              },
            }
          );

        processor = new ReleaseGroupProcessor(
          tree,
          projectGraph,
          nxReleaseConfig,
          releaseGroups
        );
        await processor.buildGroupGraph();

        mockDeriveSpecifierFromGit.mockImplementation((projectName) => {
          // Only projectK has a specifier. This should cause only itself to be bumped and not projectJ, because generatorOptions.updateDependents is set to "never"
          if (projectName === 'projectK') return 'minor';
          return 'none';
        });
        await processor.processGroups();

        // Called for each project
        expect(mockDeriveSpecifierFromGit).toHaveBeenCalledTimes(3);

        // projectJ is not bumped because generatorOptions.updateDependents is set to "never", and the dependency on projectK is therefore also not updated
        expect(readJson(tree, 'projectJ/package.json')).toMatchInlineSnapshot(`
          {
            "dependencies": {
              "projectK": "2.0.0",
            },
            "name": "projectJ",
            "version": "1.0.0",
          }
        `);
        // projectK is bumped based on its own specifier of minor
        expect(readJson(tree, 'projectK/package.json')).toMatchInlineSnapshot(`
          {
            "dependencies": {
              "projectL": "3.0.0",
            },
            "name": "projectK",
            "version": "2.1.0",
          }
        `);
        // projectL is not bumped
        expect(readJson(tree, 'projectL/package.json')).toMatchInlineSnapshot(`
          {
            "name": "projectL",
            "version": "3.0.0",
          }
        `);
      });

      it('should not bump dependents if their dependencies have resolved specifiers, if generatorOptions.updateDependents is set to "never" - TRANSITIVE DEPENDENCY', async () => {
        const { nxReleaseConfig, projectGraph, releaseGroups } =
          await createNxReleaseConfigAndPopulateWorkspace(
            tree,
            `
          __default__ ({ "projectsRelationship": "independent" }):
            - projectJ@1.0.0 [js]
              -> depends on projectK
            - projectK@2.0.0 [js]
              -> depends on projectL
            - projectL@3.0.0 [js]
        `,
            {
              version: {
                conventionalCommits: true,
                // TODO: Move this to top level option
                generatorOptions: {
                  updateDependents: 'never',
                },
              },
            }
          );

        processor = new ReleaseGroupProcessor(
          tree,
          projectGraph,
          nxReleaseConfig,
          releaseGroups
        );
        await processor.buildGroupGraph();

        // This time bump projectL which would otherwise cause a cascade of bumps across projectK and projectJ, but should not here because generatorOptions.updateDependents is set to "never"
        mockDeriveSpecifierFromGit.mockImplementation((projectName) => {
          // Only projectL has a specifier
          if (projectName === 'projectL') return 'major';
          return 'none';
        });
        await processor.processGroups();

        // Called for each project
        expect(mockDeriveSpecifierFromGit).toHaveBeenCalledTimes(3);

        // projectJ is not bumped because generatorOptions.updateDependents is set to "never"
        expect(readJson(tree, 'projectJ/package.json')).toMatchInlineSnapshot(`
          {
            "dependencies": {
              "projectK": "2.0.0",
            },
            "name": "projectJ",
            "version": "1.0.0",
          }
        `);
        // projectK is not bumped because generatorOptions.updateDependents is set to "never", and the dependency on projectL is therefore also not updated
        expect(readJson(tree, 'projectK/package.json')).toMatchInlineSnapshot(`
          {
            "dependencies": {
              "projectL": "3.0.0",
            },
            "name": "projectK",
            "version": "2.0.0",
          }
        `);
        // projectL is bumped by a major
        expect(readJson(tree, 'projectL/package.json')).toMatchInlineSnapshot(`
          {
            "name": "projectL",
            "version": "4.0.0",
          }
        `);
      });
    });
  });
});