/**
 * Crosslist Category Extractor
 * 
 * Run this in the browser console while logged in at app.crosslist.com/product/new
 * It fetches the full category tree (all levels) + dynamic fields per leaf.
 * 
 * Usage:
 *   1. Log in to app.crosslist.com
 *   2. Open a new item form
 *   3. Open DevTools → Console
 *   4. Paste and run this script
 *   5. Wait for "DONE" message (takes ~2-3 minutes)
 *   6. Copy the downloaded JSON to src/data/marketplace/crosslist-categories-full.json
 * 
 * Last extracted: 2026-03-30 (10,389 nodes / 9,234 leaves)
 */

(async function extractCrosslistCategories() {
  console.log('🚀 Starting Crosslist category extraction...');
  
  const state = { cats: {}, root: null, dp: {}, done: 0, total: 0 };

  async function fetchJSON(url) {
    const r = await fetch(url, { credentials: 'include' });
    return r.json();
  }

  async function fetchLevel(parentIds) {
    const results = await Promise.all(
      parentIds.map(id =>
        fetchJSON(`/api/Product/GetCategories?parentId=${id}`)
          .then(data => { state.cats[id] = data; })
          .catch(() => { state.cats[id] = []; })
      )
    );
  }

  // Step 1: Root categories
  console.log('Fetching root categories...');
  state.root = await fetchJSON('/api/Product/GetCategories');
  console.log(`✅ Root: ${state.root.length} categories`);

  // Step 2: Level 1
  await fetchLevel(state.root.map(c => c.id));
  console.log(`✅ Level 1: ${Object.keys(state.cats).length} fetched`);

  // Step 3+: Keep drilling until no non-leaf nodes remain
  let level = 2;
  while (true) {
    const nonLeaf = [];
    Object.keys(state.cats).forEach(pid => {
      state.cats[pid].forEach(c => {
        if (!c.isEndNode && !state.cats[c.id]) nonLeaf.push(c.id);
      });
    });
    state.root.filter(r => !r.isEndNode && !state.cats[r.id]).forEach(r => nonLeaf.push(r.id));
    
    if (nonLeaf.length === 0) break;
    
    console.log(`Fetching level ${level}: ${nonLeaf.length} nodes...`);
    
    // Batch in chunks of 30 to avoid rate limiting
    for (let i = 0; i < nonLeaf.length; i += 30) {
      await fetchLevel(nonLeaf.slice(i, i + 30));
      await new Promise(r => setTimeout(r, 300));
    }
    console.log(`✅ Level ${level}: total ${Object.keys(state.cats).length} nodes`);
    level++;
    if (level > 10) { console.warn('Max depth reached'); break; }
  }

  // Step 4: Get all leaf IDs
  const allLeaves = [];
  const seen = new Set();
  Object.keys(state.cats).forEach(pid => {
    state.cats[pid].forEach(c => {
      if (c.isEndNode && !seen.has(c.id)) { allLeaves.push(c); seen.add(c.id); }
    });
  });
  state.root.filter(r => r.isEndNode && !seen.has(r.id)).forEach(r => { allLeaves.push(r); seen.add(r.id); });
  console.log(`\n📊 Total leaves: ${allLeaves.length}`);

  // Step 5: Fetch dynamic properties per leaf (batched)
  console.log('Fetching dynamic properties per category...');
  state.total = allLeaves.length;
  
  for (let i = 0; i < allLeaves.length; i += 30) {
    const batch = allLeaves.slice(i, i + 30);
    await Promise.all(batch.map(leaf =>
      fetchJSON(`/api/Product/GetDynamicProperties?categoryId=${leaf.id}`)
        .then(d => {
          if (d.dynamicProperties?.length) state.dp[leaf.id] = d.dynamicProperties;
          state.done++;
        })
        .catch(() => { state.done++; })
    ));
    if (i % 300 === 0) console.log(`  Dynamic props: ${state.done}/${state.total}`);
    await new Promise(r => setTimeout(r, 200));
  }
  console.log(`✅ Dynamic properties: ${Object.keys(state.dp).length} categories have extra fields`);

  // Step 6: Build full tree
  function buildTree(nodes, catsMap) {
    return nodes.map(n => ({
      id: n.id,
      title: n.title,
      fullName: n.fullName || n.title,
      isLeaf: n.isEndNode,
      sortOrder: n.sortOrder || 0,
      children: n.isEndNode ? [] : buildTree(catsMap[n.id] || [], catsMap)
    }));
  }

  const tree = buildTree(state.root, state.cats);

  const output = {
    _meta: {
      source: 'app.crosslist.com',
      extracted: new Date().toISOString(),
      totalRootCats: state.root.length,
      totalNodes: Object.values(state.cats).reduce((a, v) => a + v.length, 0) + state.root.length,
      totalLeaves: allLeaves.length,
      categoriesWithDynamicFields: Object.keys(state.dp).length,
      note: 'Full tree extraction. Dynamic field definitions returned by GetDynamicProperties API.'
    },
    tree,
    dynamicProperties: state.dp
  };

  // Step 7: Download
  const blob = new Blob([JSON.stringify(output, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'crosslist-categories-full.json';
  a.click();

  console.log(`\n✅ DONE! Downloaded crosslist-categories-full.json`);
  console.log(`   Nodes: ${output._meta.totalNodes} | Leaves: ${output._meta.totalLeaves}`);
  console.log(`   Save to: src/data/marketplace/crosslist-categories-full.json`);

  return output;
})();
