
  // it('should handle multiple groups with mixed ecosystems', async () => {
  //   const { nxReleaseConfig, projectGraph, releaseGroups } =
  //     await createNxReleaseConfigAndPopulateWorkspace(
  //       tree,
  //       `
  //         GroupA ({ "projectsRelationship": "fixed" }):
  //           - projectA@1.0.0 [js]
  //           - projectB@1.0.0 [rust]
  //         GroupB ({ "projectsRelationship": "independent" }):
  //           - projectC@2.0.0 [js]
  //           - projectD@3.0.0 [rust]
  //       `,
  //       {
  //         version: {
  //           conventionalCommits: true,
  //         },
  //       }
  //     );

  //   mockDeriveSpecifierFromGit.mockImplementation((projectName) => {
  //     if (projectName === 'projectA') return 'minor';
  //     if (projectName === 'projectC') return 'patch';
  //     return 'none';
  //   });

  //   const processor = new ReleaseGroupProcessor(
  //     tree,
  //     projectGraph,
  //     nxReleaseConfig,
  //     releaseGroups
  //   );

  //   await processor.buildGroupGraph();
  //   await processor.processGroups();

  //   expect(readJson(tree, 'projectA/package.json').version).toBe('1.1.0');
  //   expect(tree.read('projectB/Cargo.toml', 'utf-8')!.toString()).toContain(
  //     'version = "1.1.0"'
  //   );
  //   expect(readJson(tree, 'projectC/package.json').version).toBe('2.0.1');
  //   expect(tree.read('projectD/Cargo.toml', 'utf-8')!.toString()).toContain(
  //     'version = "3.0.0"'
  //   );
  // });

  // it('should handle a group with only one ecosystem (JS)', async () => {
  //   const { nxReleaseConfig, projectGraph, releaseGroups } =
  //     await createNxReleaseConfigAndPopulateWorkspace(
  //       tree,
  //       `
  //         JsGroup ({ "projectsRelationship": "fixed" }):
  //           - projectA@1.0.0 [js]
  //           - projectB@1.0.0 [js]
  //           - projectC@1.0.0 [js]
  //       `,
  //       {
  //         version: {
  //           conventionalCommits: true,
  //         },
  //       }
  //     );

  //   mockDeriveSpecifierFromGit.mockImplementation((projectName) => {
  //     if (projectName === 'projectB') return 'minor';
  //     return 'none';
  //   });

  //   const processor = new ReleaseGroupProcessor(
  //     tree,
  //     projectGraph,
  //     nxReleaseConfig,
  //     releaseGroups
  //   );

  //   await processor.buildGroupGraph();
  //   await processor.processGroups();

  //   expect(readJson(tree, 'projectA/package.json').version).toBe('1.1.0');
  //   expect(readJson(tree, 'projectB/package.json').version).toBe('1.1.0');
  //   expect(readJson(tree, 'projectC/package.json').version).toBe('1.1.0');
  // });

  // it('should handle a group with only one ecosystem (Rust)', async () => {
  //   const { nxReleaseConfig, projectGraph, releaseGroups } =
  //     await createNxReleaseConfigAndPopulateWorkspace(
  //       tree,
  //       `
  //         RustGroup ({ "projectsRelationship": "independent" }):
  //           - projectA@1.0.0 [rust]
  //           - projectB@2.0.0 [rust]
  //           - projectC@3.0.0 [rust]
  //       `,
  //       {
  //         version: {
  //           conventionalCommits: true,
  //         },
  //       }
  //     );

  //   mockDeriveSpecifierFromGit.mockImplementation((projectName) => {
  //     if (projectName === 'projectA') return 'minor';
  //     if (projectName === 'projectC') return 'patch';
  //     return 'none';
  //   });

  //   const processor = new ReleaseGroupProcessor(
  //     tree,
  //     projectGraph,
  //     nxReleaseConfig,
  //     releaseGroups
  //   );

  //   await processor.buildGroupGraph();
  //   await processor.processGroups();

  //   expect(tree.read('projectA/Cargo.toml', 'utf-8')!.toString()).toContain(
  //     'version = "1.1.0"'
  //   );
  //   expect(tree.read('projectB/Cargo.toml', 'utf-8')!.toString()).toContain(
  //     'version = "2.0.0"'
  //   );
  //   expect(tree.read('projectC/Cargo.toml', 'utf-8')!.toString()).toContain(
  //     'version = "3.0.1"'
  //   );
  // });

  // it('should handle complex dependencies between groups', async () => {
  //   const { nxReleaseConfig, projectGraph, releaseGroups } =
  //     await createNxReleaseConfigAndPopulateWorkspace(
  //       tree,
  //       `
  //         GroupA ({ "projectsRelationship": "fixed" }):
  //           - projectA@1.0.0 [js]
  //           - projectB@1.0.0 [js]
  //         GroupB ({ "projectsRelationship": "independent" }):
  //           - projectC@2.0.0 [js]
  //             -> depends on projectA
  //           - projectD@3.0.0 [rust]
  //             -> depends on projectB
  //         GroupC ({ "projectsRelationship": "fixed" }):
  //           - projectE@4.0.0 [rust]
  //             -> depends on projectC
  //           - projectF@4.0.0 [js]
  //             -> depends on projectD
  //       `,
  //       {
  //         version: {
  //           conventionalCommits: true,
  //         },
  //       }
  //     );

  //   mockDeriveSpecifierFromGit.mockImplementation((projectName) => {
  //     if (projectName === 'projectA') return 'minor';
  //     if (projectName === 'projectC') return 'patch';
  //     return 'none';
  //   });

  //   const processor = new ReleaseGroupProcessor(
  //     tree,
  //     projectGraph,
  //     nxReleaseConfig,
  //     releaseGroups
  //   );

  //   await processor.buildGroupGraph();
  //   await processor.processGroups();

  //   expect(readJson(tree, 'projectA/package.json').version).toBe('1.1.0');
  //   expect(readJson(tree, 'projectB/package.json').version).toBe('1.1.0');
  //   expect(readJson(tree, 'projectC/package.json').version).toBe('2.0.1');
  //   expect(tree.read('projectD/Cargo.toml', 'utf-8')!.toString()).toContain(
  //     'version = "3.0.1"'
  //   );
  //   expect(tree.read('projectE/Cargo.toml', 'utf-8')!.toString()).toContain(
  //     'version = "4.0.1"'
  //   );
  //   expect(readJson(tree, 'projectF/package.json').version).toBe('4.0.1');
  // });

  // describe('sideEffectBump', () => {
  //   it('should handle mixed fixed and independent groups with different languages and default sideEffectBump of "patch"', async () => {
  //     const { nxReleaseConfig, projectGraph, releaseGroups } =
  //       await createNxReleaseConfigAndPopulateWorkspace(
  //         tree,
  //         `
  //           GroupO ({ "projectsRelationship": "fixed" }):
  //             - projectU@1.0.0 [js]
  //               -> depends on projectQ
  //             - projectV@1.0.0 [rust]

  //           GroupM ({ "projectsRelationship": "fixed" }):
  //             - projectQ@1.0.0 [js]
  //             - projectR@1.0.0 [rust]

  //           GroupN ({ "projectsRelationship": "independent" }):
  //             - projectS@1.0.0 [js]
  //               -> depends on projectQ
  //             - projectT@1.0.0 [rust]
  //         `,
  //         {
  //           version: {
  //             conventionalCommits: true,
  //           },
  //         }
  //       );

  //     // Mock the git specifier function
  //     mockDeriveSpecifierFromGit.mockImplementation((projectName) => {
  //       if (projectName === 'projectQ') {
  //         return 'minor';
  //       }
  //       return 'none';
  //     });

  //     const processor = new ReleaseGroupProcessor(
  //       tree,
  //       projectGraph,
  //       nxReleaseConfig,
  //       releaseGroups
  //     );

  //     await processor.buildGroupGraph();
  //     const processOrder = await processor.processGroups();
  //     expect(processOrder).toEqual(['GroupM', 'GroupO', 'GroupN']);

  //     // GroupM packages are bumped by minor, per the specifier from the git history
  //     expect(readJson(tree, 'projectQ/package.json').version).toBe('1.1.0');
  //     expect(tree.read('projectR/Cargo.toml', 'utf-8')!.toString()).toContain(
  //       'version = "1.1.0"'
  //     );

  //     // GroupO packages are bumped by patch
  //     expect(readJson(tree, 'projectU/package.json').version).toBe('1.0.1');
  //     expect(tree.read('projectV/Cargo.toml', 'utf-8')!.toString()).toContain(
  //       'version = "1.0.1"'
  //     );

  //     // GroupN is an independent group
  //     expect(readJson(tree, 'projectS/package.json').version).toBe('1.0.1');
  //     expect(tree.read('projectT/Cargo.toml', 'utf-8')!.toString()).toContain(
  //       'version = "1.0.0"'
  //     );
  //   });

    // it.only('should handle mixed fixed and independent groups with different languages and default sideEffectBump of "patch"', async () => {
    //   writeJson(tree, 'projectQ/package.json', { version: '1.0.0' });
    //   tree.write('projectR/Cargo.toml', 'version = "1.0.0"');

    //   writeJson(tree, 'projectS/package.json', { version: '1.0.0' });
    //   tree.write('projectT/Cargo.toml', 'version = "1.0.0"');

    //   writeJson(tree, 'projectU/package.json', { version: '1.0.0' });
    //   tree.write('projectV/Cargo.toml', 'version = "1.0.0"');

    //   const releaseGroups: ReleaseGroupWithName[] = [
    //     {
    //       name: 'GroupO',
    //       projectsRelationship: 'fixed',
    //       projects: ['projectU', 'projectV'],
    //     },
    //     {
    //       name: 'GroupM',
    //       projectsRelationship: 'fixed',
    //       projects: ['projectQ', 'projectR'],
    //     },
    //     {
    //       name: 'GroupN',
    //       projectsRelationship: 'independent',
    //       projects: ['projectS', 'projectT'],
    //     },
    //   ];
    //   const projectGraph: ProjectGraph = {
    //     nodes: {
    //       projectQ: {
    //         name: 'projectQ',
    //         type: 'lib',
    //         data: { root: 'projectQ' },
    //       },
    //       projectR: {
    //         name: 'projectR',
    //         type: 'lib',
    //         data: {
    //           root: 'projectR',
    //           release: {
    //             manifestActions: '__EXAMPLE_RUST_MANIFEST_ACTIONS__',
    //           } as any,
    //         },
    //       },
    //       projectS: {
    //         name: 'projectS',
    //         type: 'lib',
    //         data: { root: 'projectS' },
    //       },
    //       projectT: {
    //         name: 'projectT',
    //         type: 'lib',
    //         data: {
    //           root: 'projectT',
    //           release: {
    //             manifestActions: '__EXAMPLE_RUST_MANIFEST_ACTIONS__',
    //           } as any,
    //         },
    //       },
    //       projectU: {
    //         name: 'projectU',
    //         type: 'lib',
    //         data: { root: 'projectU' },
    //       },
    //       projectV: {
    //         name: 'projectV',
    //         type: 'lib',
    //         data: {
    //           root: 'projectV',
    //           release: {
    //             manifestActions: '__EXAMPLE_RUST_MANIFEST_ACTIONS__',
    //           } as any,
    //         },
    //       },
    //     },
    //     dependencies: {
    //       projectS: [
    //         { source: 'projectS', target: 'projectQ', type: 'static' },
    //       ],
    //       projectU: [
    //         { source: 'projectU', target: 'projectQ', type: 'static' },
    //       ],
    //     },
    //   };
    //   const globalConfig: VersionBumpConfig = {
    //     specifierSource: 'conventional-commits',
    //   };

    //   // projectQ has a specifier of "minor" via the git history
    //   mockDeriveSpecifierFromGit.mockImplementation((projectPath) => {
    //     if (projectPath === 'projectQ') {
    //       return 'minor';
    //     }
    //     return 'none';
    //   });

    //   const processor = new ReleaseGroupProcessor(
    //     releaseGroups,
    //     projectGraph,
    //     tree,
    //     globalConfig,
    //     mockVersionBumpUtils
    //   );
    //   await processor.buildGroupGraph();
    //   const processOrder = await processor.processGroups();
    //   expect(processOrder).toEqual(['GroupM', 'GroupO', 'GroupN']);

    //   // GroupM packages are bumped by minor, per the specifier from the git history
    //   expect(readJson(tree, 'projectQ/package.json').version).toBe('1.1.0');
    //   expect(tree.read('projectR/Cargo.toml', 'utf-8')!.toString()).toContain(
    //     'version = "1.1.0"'
    //   );

    //   // GroupO packages are bumped by patch, because they have no git history but projectU depends on projectQ, and GroupO is fixed, so projectV is bumped by patch too
    //   expect(readJson(tree, 'projectU/package.json').version).toBe('1.0.1');
    //   expect(tree.read('projectV/Cargo.toml', 'utf-8')!.toString()).toContain(
    //     'version = "1.0.1"'
    //   );

    //   // GroupN is an independent group, so only projectS is bumped by a patch because of its dependency on projectQ, projectT is not bumped
    //   expect(readJson(tree, 'projectS/package.json').version).toBe('1.0.1');
    //   expect(tree.read('projectT/Cargo.toml', 'utf-8')!.toString()).toContain(
    //     'version = "1.0.0"'
    //   );
    // });

    // it('should handle mixed fixed and independent groups with different languages and an explicit global sideEffectBump of "minor"', async () => {
    //   writeJson(tree, 'projectQ/package.json', { version: '1.0.0' });
    //   tree.write('projectR/Cargo.toml', 'version = "1.0.0"');

    //   writeJson(tree, 'projectS/package.json', { version: '1.0.0' });
    //   tree.write('projectT/Cargo.toml', 'version = "1.0.0"');

    //   writeJson(tree, 'projectU/package.json', { version: '1.0.0' });
    //   tree.write('projectV/Cargo.toml', 'version = "1.0.0"');

    //   const releaseGroups: ReleaseGroupWithName[] = [
    //     {
    //       name: 'GroupO',
    //       projectsRelationship: 'fixed',
    //       projects: ['projectU', 'projectV'],
    //     },
    //     {
    //       name: 'GroupM',
    //       projectsRelationship: 'fixed',
    //       projects: ['projectQ', 'projectR'],
    //     },
    //     {
    //       name: 'GroupN',
    //       projectsRelationship: 'independent',
    //       projects: ['projectS', 'projectT'],
    //     },
    //   ];
    //   const projectGraph: ProjectGraph = {
    //     nodes: {
    //       projectQ: {
    //         name: 'projectQ',
    //         type: 'lib',
    //         data: { root: 'projectQ' },
    //       },
    //       projectR: {
    //         name: 'projectR',
    //         type: 'lib',
    //         data: { root: 'projectR' },
    //       },
    //       projectS: {
    //         name: 'projectS',
    //         type: 'lib',
    //         data: { root: 'projectS' },
    //       },
    //       projectT: {
    //         name: 'projectT',
    //         type: 'lib',
    //         data: { root: 'projectT' },
    //       },
    //       projectU: {
    //         name: 'projectU',
    //         type: 'lib',
    //         data: { root: 'projectU' },
    //       },
    //       projectV: {
    //         name: 'projectV',
    //         type: 'lib',
    //         data: { root: 'projectV' },
    //       },
    //     },
    //     dependencies: {
    //       projectS: [
    //         { source: 'projectS', target: 'projectQ', type: 'static' },
    //       ],
    //       projectU: [
    //         { source: 'projectU', target: 'projectQ', type: 'static' },
    //       ],
    //     },
    //   };
    //   const globalConfig: VersionBumpConfig = {
    //     specifierSource: 'conventional-commits',
    //     sideEffectBump: 'minor',
    //   };

    //   // projectQ has a specifier of "minor" via the git history
    //   mockDeriveSpecifierFromGit.mockImplementation((projectPath) => {
    //     if (projectPath === 'projectQ') {
    //       return 'minor';
    //     }
    //     return 'none';
    //   });

    //   const processor = new ReleaseGroupProcessor(
    //     releaseGroups,
    //     projectGraph,
    //     tree,
    //     globalConfig,
    //     mockVersionBumpUtils
    //   );
    //   await processor.buildGroupGraph();
    //   const processOrder = await processor.processGroups();
    //   expect(processOrder).toEqual(['GroupM', 'GroupO', 'GroupN']);

    //   // GroupM packages are bumped by minor, per the specifier from the git history
    //   expect(readJson(tree, 'projectQ/package.json').version).toBe('1.1.0');
    //   expect(tree.read('projectR/Cargo.toml', 'utf-8')!.toString()).toContain(
    //     'version = "1.1.0"'
    //   );

    //   // GroupO packages are bumped by minor, because they have no git history but projectU depends on projectQ, and GroupO is fixed, so projectV is bumped by minor too
    //   expect(readJson(tree, 'projectU/package.json').version).toBe('1.1.0');
    //   expect(tree.read('projectV/Cargo.toml', 'utf-8')!.toString()).toContain(
    //     'version = "1.1.0"'
    //   );

    //   // GroupN is an independent group, so only projectS is bumped by a minor because of its dependency on projectQ, projectT is not bumped
    //   expect(readJson(tree, 'projectS/package.json').version).toBe('1.1.0');
    //   expect(tree.read('projectT/Cargo.toml', 'utf-8')!.toString()).toContain(
    //     'version = "1.0.0"'
    //   );
    // });

    // it('should handle mixed fixed and independent groups with different languages and an explicit global sideEffectBump of "major"', async () => {
    //   writeJson(tree, 'projectQ/package.json', { version: '1.0.0' });
    //   tree.write('projectR/Cargo.toml', 'version = "1.0.0"');

    //   writeJson(tree, 'projectS/package.json', { version: '1.0.0' });
    //   tree.write('projectT/Cargo.toml', 'version = "1.0.0"');

    //   writeJson(tree, 'projectU/package.json', { version: '1.0.0' });
    //   tree.write('projectV/Cargo.toml', 'version = "1.0.0"');

    //   const releaseGroups: ReleaseGroupWithName[] = [
    //     {
    //       name: 'GroupO',
    //       projectsRelationship: 'fixed',
    //       projects: ['projectU', 'projectV'],
    //     },
    //     {
    //       name: 'GroupM',
    //       projectsRelationship: 'fixed',
    //       projects: ['projectQ', 'projectR'],
    //     },
    //     {
    //       name: 'GroupN',
    //       projectsRelationship: 'independent',
    //       projects: ['projectS', 'projectT'],
    //     },
    //   ];
    //   const projectGraph: ProjectGraph = {
    //     nodes: {
    //       projectQ: {
    //         name: 'projectQ',
    //         type: 'lib',
    //         data: { root: 'projectQ' },
    //       },
    //       projectR: {
    //         name: 'projectR',
    //         type: 'lib',
    //         data: { root: 'projectR' },
    //       },
    //       projectS: {
    //         name: 'projectS',
    //         type: 'lib',
    //         data: { root: 'projectS' },
    //       },
    //       projectT: {
    //         name: 'projectT',
    //         type: 'lib',
    //         data: { root: 'projectT' },
    //       },
    //       projectU: {
    //         name: 'projectU',
    //         type: 'lib',
    //         data: { root: 'projectU' },
    //       },
    //       projectV: {
    //         name: 'projectV',
    //         type: 'lib',
    //         data: { root: 'projectV' },
    //       },
    //     },
    //     dependencies: {
    //       projectS: [
    //         { source: 'projectS', target: 'projectQ', type: 'static' },
    //       ],
    //       projectU: [
    //         { source: 'projectU', target: 'projectQ', type: 'static' },
    //       ],
    //     },
    //   };
    //   const globalConfig: VersionBumpConfig = {
    //     specifierSource: 'conventional-commits',
    //     sideEffectBump: 'major',
    //   };

    //   // projectQ has a specifier of "minor" via the git history
    //   mockDeriveSpecifierFromGit.mockImplementation((projectPath) => {
    //     if (projectPath === 'projectQ') {
    //       return 'minor';
    //     }
    //     return 'none';
    //   });

    //   const processor = new ReleaseGroupProcessor(
    //     releaseGroups,
    //     projectGraph,
    //     tree,
    //     globalConfig,
    //     mockVersionBumpUtils
    //   );
    //   await processor.buildGroupGraph();
    //   const processOrder = await processor.processGroups();
    //   expect(processOrder).toEqual(['GroupM', 'GroupO', 'GroupN']);

    //   // GroupM packages are bumped by minor, per the specifier from the git history
    //   expect(readJson(tree, 'projectQ/package.json').version).toBe('1.1.0');
    //   expect(tree.read('projectR/Cargo.toml', 'utf-8')!.toString()).toContain(
    //     'version = "1.1.0"'
    //   );

    //   // GroupO packages are bumped by major, because they have no git history but projectU depends on projectQ, and GroupO is fixed, so projectV is bumped by major too
    //   expect(readJson(tree, 'projectU/package.json').version).toBe('2.0.0');
    //   expect(tree.read('projectV/Cargo.toml', 'utf-8')!.toString()).toContain(
    //     'version = "2.0.0"'
    //   );

    //   // GroupN is an independent group, so only projectS is bumped by a major because of its dependency on projectQ, projectT is not bumped
    //   expect(readJson(tree, 'projectS/package.json').version).toBe('2.0.0');
    //   expect(tree.read('projectT/Cargo.toml', 'utf-8')!.toString()).toContain(
    //     'version = "1.0.0"'
    //   );
    // });

    // it('should handle mixed fixed and independent groups with different languages and an explicit global sideEffectBump of "auto"', async () => {
    //   writeJson(tree, 'projectQ/package.json', { version: '1.0.0' });
    //   tree.write('projectR/Cargo.toml', 'version = "1.0.0"');

    //   writeJson(tree, 'projectS/package.json', { version: '1.0.0' });
    //   tree.write('projectT/Cargo.toml', 'version = "1.0.0"');

    //   writeJson(tree, 'projectU/package.json', { version: '1.0.0' });
    //   tree.write('projectV/Cargo.toml', 'version = "1.0.0"');

    //   const releaseGroups: ReleaseGroupWithName[] = [
    //     {
    //       name: 'GroupO',
    //       projectsRelationship: 'fixed',
    //       projects: ['projectU', 'projectV'],
    //     },
    //     {
    //       name: 'GroupM',
    //       projectsRelationship: 'fixed',
    //       projects: ['projectQ', 'projectR'],
    //     },
    //     {
    //       name: 'GroupN',
    //       projectsRelationship: 'independent',
    //       projects: ['projectS', 'projectT'],
    //     },
    //   ];
    //   const projectGraph: ProjectGraph = {
    //     nodes: {
    //       projectQ: {
    //         name: 'projectQ',
    //         type: 'lib',
    //         data: { root: 'projectQ' },
    //       },
    //       projectR: {
    //         name: 'projectR',
    //         type: 'lib',
    //         data: { root: 'projectR' },
    //       },
    //       projectS: {
    //         name: 'projectS',
    //         type: 'lib',
    //         data: { root: 'projectS' },
    //       },
    //       projectT: {
    //         name: 'projectT',
    //         type: 'lib',
    //         data: { root: 'projectT' },
    //       },
    //       projectU: {
    //         name: 'projectU',
    //         type: 'lib',
    //         data: { root: 'projectU' },
    //       },
    //       projectV: {
    //         name: 'projectV',
    //         type: 'lib',
    //         data: { root: 'projectV' },
    //       },
    //     },
    //     dependencies: {
    //       projectS: [
    //         { source: 'projectS', target: 'projectQ', type: 'static' },
    //       ],
    //       projectU: [
    //         { source: 'projectU', target: 'projectQ', type: 'static' },
    //       ],
    //     },
    //   };
    //   const globalConfig: VersionBumpConfig = {
    //     specifierSource: 'conventional-commits',
    //     sideEffectBump: 'same-as-dependency',
    //   };

    //   // projectQ has a specifier of "minor" via the git history
    //   mockDeriveSpecifierFromGit.mockImplementation((projectPath) => {
    //     if (projectPath === 'projectQ') {
    //       return 'minor';
    //     }
    //     return 'none';
    //   });

    //   const processor = new ReleaseGroupProcessor(
    //     releaseGroups,
    //     projectGraph,
    //     tree,
    //     globalConfig,
    //     mockVersionBumpUtils
    //   );
    //   await processor.buildGroupGraph();
    //   const processOrder = await processor.processGroups();
    //   expect(processOrder).toEqual(['GroupM', 'GroupO', 'GroupN']);

    //   // GroupM packages are bumped by minor, per the specifier from the git history
    //   expect(readJson(tree, 'projectQ/package.json').version).toBe('1.1.0');
    //   expect(tree.read('projectR/Cargo.toml', 'utf-8')!.toString()).toContain(
    //     'version = "1.1.0"'
    //   );

    //   // GroupO packages are bumped by minor (via same-as-dependency), because they have no git history but projectU depends on projectQ, and GroupO is fixed, so projectV is bumped by minor too (via same-as-dependency)
    //   expect(readJson(tree, 'projectU/package.json').version).toBe('1.1.0');
    //   expect(tree.read('projectV/Cargo.toml', 'utf-8')!.toString()).toContain(
    //     'version = "1.1.0"'
    //   );

    //   // GroupN is an independent group, so only projectS is bumped by a minor (via same-as-dependency) because of its dependency on projectQ, projectT is not bumped
    //   expect(readJson(tree, 'projectS/package.json').version).toBe('1.1.0');
    //   expect(tree.read('projectT/Cargo.toml', 'utf-8')!.toString()).toContain(
    //     'version = "1.0.0"'
    //   );
    // });
  // });
