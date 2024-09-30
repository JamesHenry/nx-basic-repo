import { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
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

const { ReleaseGroupProcessor } = require('./release-group-processor') as {
  ReleaseGroupProcessor: typeof import('./release-group-processor').ReleaseGroupProcessor;
};

// Using the daemon in unit tests would cause jest to never exit
process.env.NX_DAEMON = 'false';

describe('Multiple Release Groups', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    jest.resetAllMocks();

    mockResolveManifestActionsForProject.mockImplementation(
      async (tree, releaseGroup, projectGraphNode) => {
        const exampleRustManifestActions = '__EXAMPLE_RUST_MANIFEST_ACTIONS__';
        if (
          projectGraphNode.data.release?.manifestActions ===
            exampleRustManifestActions ||
          releaseGroup.manifestActions === exampleRustManifestActions
        ) {
          const manifestActions = new ExampleRustManifestActions(
            projectGraphNode
          );
          await manifestActions.ensureManifestExistsAtExpectedLocation(tree);
          return manifestActions;
        }
        const JsManifestActions = jest.requireActual(
          './flexible-version-management'
        ).JsManifestActions;
        const manifestActions = new JsManifestActions(projectGraphNode);
        await manifestActions.ensureManifestExistsAtExpectedLocation(tree);
        return manifestActions;
      }
    );
  });

  describe('Two unrelated groups, both fixed relationship, just JS', () => {
    it('should correctly version projects using mocked conventional commits', async () => {
      const { nxReleaseConfig, projectGraph, releaseGroups } =
        await createNxReleaseConfigAndPopulateWorkspace(
          tree,
          `
            group1 ({ "projectsRelationship": "fixed" }):
              - pkg-a@1.0.0 [js]
              - pkg-b@1.0.0 [js]
                -> depends on pkg-a
            group2 ({ "projectsRelationship": "fixed" }):
              - pkg-c@2.0.0 [js]
              - pkg-d@2.0.0 [js]
                -> depends on pkg-c
          `,
          {
            version: {
              conventionalCommits: true,
            },
          }
        );

      mockDeriveSpecifierFromGit.mockImplementation((projectName) => {
        if (projectName === 'pkg-a') return 'minor';
        if (projectName === 'pkg-b') return 'minor';
        if (projectName === 'pkg-c') return 'patch';
        if (projectName === 'pkg-d') return 'patch';
        return 'none';
      });

      const processor = new ReleaseGroupProcessor(
        tree,
        projectGraph,
        nxReleaseConfig,
        releaseGroups
      );

      await processor.buildGroupGraph();
      await processor.processGroups();

      // Called for each project
      expect(mockResolveManifestActionsForProject).toHaveBeenCalledTimes(4);

      expect(tree.read('pkg-a/package.json', 'utf-8')).toMatchInlineSnapshot(`
        "{
          "name": "pkg-a",
          "version": "1.1.0"
        }
        "
      `);
      expect(tree.read('pkg-b/package.json', 'utf-8')).toMatchInlineSnapshot(`
        "{
          "name": "pkg-b",
          "version": "1.1.0",
          "dependencies": {
            "pkg-a": "1.1.0"
          }
        }
        "
      `);
      expect(tree.read('pkg-c/package.json', 'utf-8')).toMatchInlineSnapshot(`
        "{
          "name": "pkg-c",
          "version": "2.0.1"
        }
        "
      `);
      expect(tree.read('pkg-d/package.json', 'utf-8')).toMatchInlineSnapshot(`
        "{
          "name": "pkg-d",
          "version": "2.0.1",
          "dependencies": {
            "pkg-c": "2.0.1"
          }
        }
        "
      `);
    });
  });

  describe('Two unrelated groups, both independent relationship, just JS', () => {
    it('should correctly version projects using mocked conventional commits', async () => {
      const { nxReleaseConfig, projectGraph, releaseGroups } =
        await createNxReleaseConfigAndPopulateWorkspace(
          tree,
          `
            group1 ({ "projectsRelationship": "independent" }):
              - pkg-a@1.0.0 [js]
              - pkg-b@1.1.0 [js]
                -> depends on pkg-a
            group2 ({ "projectsRelationship": "independent" }):
              - pkg-c@2.0.0 [js]
              - pkg-d@2.1.0 [js]
                -> depends on pkg-c
          `,
          {
            version: {
              conventionalCommits: true,
            },
          }
        );

      mockDeriveSpecifierFromGit.mockImplementation((projectName) => {
        if (projectName === 'pkg-a') return 'minor';
        if (projectName === 'pkg-b') return 'patch';
        if (projectName === 'pkg-c') return 'major';
        if (projectName === 'pkg-d') return 'none';
        return 'none';
      });

      const processor = new ReleaseGroupProcessor(
        tree,
        projectGraph,
        nxReleaseConfig,
        releaseGroups
      );

      await processor.buildGroupGraph();
      await processor.processGroups();

      // Called for each project
      expect(mockResolveManifestActionsForProject).toHaveBeenCalledTimes(4);

      expect(tree.read('pkg-a/package.json', 'utf-8')).toMatchInlineSnapshot(`
        "{
          "name": "pkg-a",
          "version": "1.1.0"
        }
        "
      `);
      expect(tree.read('pkg-b/package.json', 'utf-8')).toMatchInlineSnapshot(`
        "{
          "name": "pkg-b",
          "version": "1.1.1",
          "dependencies": {
            "pkg-a": "1.1.0"
          }
        }
        "
      `);
      expect(tree.read('pkg-c/package.json', 'utf-8')).toMatchInlineSnapshot(`
        "{
          "name": "pkg-c",
          "version": "3.0.0"
        }
        "
      `);
      // Patch bump due to dependency update
      expect(tree.read('pkg-d/package.json', 'utf-8')).toMatchInlineSnapshot(`
        "{
          "name": "pkg-d",
          "version": "2.1.1",
          "dependencies": {
            "pkg-c": "3.0.0"
          }
        }
        "
      `);
    });
  });

  describe('Two unrelated groups, one fixed one independent, just JS', () => {
    it('should correctly version projects using mocked conventional commits', async () => {
      const { nxReleaseConfig, projectGraph, releaseGroups } =
        await createNxReleaseConfigAndPopulateWorkspace(
          tree,
          `
            group1 ({ "projectsRelationship": "fixed" }):
              - pkg-a@1.0.0 [js]
              - pkg-b@1.0.0 [js]
                -> depends on pkg-a
            group2 ({ "projectsRelationship": "independent" }):
              - pkg-c@2.0.0 [js]
              - pkg-d@2.1.0 [js]
                -> depends on pkg-c
          `,
          {
            version: {
              conventionalCommits: true,
            },
          }
        );

      mockDeriveSpecifierFromGit.mockImplementation((projectName) => {
        if (projectName === 'pkg-a') return 'minor';
        if (projectName === 'pkg-b') return 'minor';
        if (projectName === 'pkg-c') return 'patch';
        if (projectName === 'pkg-d') return 'minor';
        return 'none';
      });

      const processor = new ReleaseGroupProcessor(
        tree,
        projectGraph,
        nxReleaseConfig,
        releaseGroups
      );

      await processor.buildGroupGraph();
      await processor.processGroups();

      // Called for each project
      expect(mockResolveManifestActionsForProject).toHaveBeenCalledTimes(4);

      expect(tree.read('pkg-a/package.json', 'utf-8')).toMatchInlineSnapshot(`
        "{
          "name": "pkg-a",
          "version": "1.1.0"
        }
        "
      `);
      expect(tree.read('pkg-b/package.json', 'utf-8')).toMatchInlineSnapshot(`
        "{
          "name": "pkg-b",
          "version": "1.1.0",
          "dependencies": {
            "pkg-a": "1.1.0"
          }
        }
        "
      `);
      expect(tree.read('pkg-c/package.json', 'utf-8')).toMatchInlineSnapshot(`
        "{
          "name": "pkg-c",
          "version": "2.0.1"
        }
        "
      `);
      expect(tree.read('pkg-d/package.json', 'utf-8')).toMatchInlineSnapshot(`
        "{
          "name": "pkg-d",
          "version": "2.2.0",
          "dependencies": {
            "pkg-c": "2.0.1"
          }
        }
        "
      `);
    });
  });

  describe('Mixed JS and Rust projects within groups', () => {
    describe('Two unrelated groups, both fixed relationship, mixed JS and Rust', () => {
      it('should correctly version projects using mocked conventional commits', async () => {
        const { nxReleaseConfig, projectGraph, releaseGroups } =
          await createNxReleaseConfigAndPopulateWorkspace(
            tree,
            `
              group1 ({ "projectsRelationship": "fixed" }):
                - pkg-a@1.0.0 [js]
                - pkg-b@1.0.0 [rust]
              group2 ({ "projectsRelationship": "fixed" }):
                - pkg-c@2.0.0 [rust]
                - pkg-d@2.0.0 [js]
            `,
            {
              version: {
                conventionalCommits: true,
              },
            }
          );

        mockDeriveSpecifierFromGit.mockImplementation((projectName) => {
          if (projectName === 'pkg-a') return 'minor';
          if (projectName === 'pkg-b') return 'minor';
          if (projectName === 'pkg-c') return 'patch';
          if (projectName === 'pkg-d') return 'patch';
          return 'none';
        });

        const processor = new ReleaseGroupProcessor(
          tree,
          projectGraph,
          nxReleaseConfig,
          releaseGroups
        );

        await processor.buildGroupGraph();
        await processor.processGroups();

        // Called for each project
        expect(mockResolveManifestActionsForProject).toHaveBeenCalledTimes(4);

        expect(tree.read('pkg-a/package.json', 'utf-8')).toMatchInlineSnapshot(`
          "{
            "name": "pkg-a",
            "version": "1.1.0"
          }
          "
        `);
        expect(tree.read('pkg-b/Cargo.toml', 'utf-8')).toMatchInlineSnapshot(`
          "
          [package]
          name = 'pkg-b'
          version = '1.1.0'
          "
        `);
        expect(tree.read('pkg-c/Cargo.toml', 'utf-8')).toMatchInlineSnapshot(`
          "
          [package]
          name = 'pkg-c'
          version = '2.0.1'
          "
        `);
        expect(tree.read('pkg-d/package.json', 'utf-8')).toMatchInlineSnapshot(`
          "{
            "name": "pkg-d",
            "version": "2.0.1"
          }
          "
        `);
      });
    });

    describe('Two unrelated groups, both independent relationship, mixed JS and Rust', () => {
      it('should correctly version projects using mocked conventional commits', async () => {
        const { nxReleaseConfig, projectGraph, releaseGroups } =
          await createNxReleaseConfigAndPopulateWorkspace(
            tree,
            `
              group1 ({ "projectsRelationship": "independent" }):
                - pkg-a@1.0.0 [js]
                - pkg-b@1.1.0 [rust]
              group2 ({ "projectsRelationship": "independent" }):
                - pkg-c@2.0.0 [rust]
                - pkg-d@2.1.0 [js]
            `,
            {
              version: {
                conventionalCommits: true,
              },
            }
          );

        mockDeriveSpecifierFromGit.mockImplementation((projectName) => {
          if (projectName === 'pkg-a') return 'minor';
          if (projectName === 'pkg-b') return 'patch';
          if (projectName === 'pkg-c') return 'major';
          if (projectName === 'pkg-d') return 'none';
          return 'none';
        });

        const processor = new ReleaseGroupProcessor(
          tree,
          projectGraph,
          nxReleaseConfig,
          releaseGroups
        );

        await processor.buildGroupGraph();
        await processor.processGroups();

        // Called for each project
        expect(mockResolveManifestActionsForProject).toHaveBeenCalledTimes(4);

        expect(tree.read('pkg-a/package.json', 'utf-8')).toMatchInlineSnapshot(`
          "{
            "name": "pkg-a",
            "version": "1.1.0"
          }
          "
        `);
        expect(tree.read('pkg-b/Cargo.toml', 'utf-8')).toMatchInlineSnapshot(`
          "
          [package]
          name = 'pkg-b'
          version = '1.1.1'
          "
        `);
        expect(tree.read('pkg-c/Cargo.toml', 'utf-8')).toMatchInlineSnapshot(`
          "
          [package]
          name = 'pkg-c'
          version = '3.0.0'
          "
        `);
        expect(tree.read('pkg-d/package.json', 'utf-8')).toMatchInlineSnapshot(`
          "{
            "name": "pkg-d",
            "version": "2.1.0"
          }
          "
        `);
      });
    });
  });
});
