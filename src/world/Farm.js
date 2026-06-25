import * as BABYLON from '@babylonjs/core';

export class FarmGenerator {
  constructor(scene, themeConfig) {
    this.scene = scene;
    this.themeConfig = themeConfig;
    this.group = new BABYLON.TransformNode("farmGroup", this.scene);
    
    this.colliders = [];
    this.interactables = [];
    this.plots3D = []; // 存储农田引用，对应原 farmPlots3D
    this.shadowCasters = []; // 用于收集投射阴影的网格

    this.buildWorld();
  }

  buildWorld() {
    // 1. 浮空草地主岛 (半径 12.0，高度 1.2)
    const island = BABYLON.MeshBuilder.CreateCylinder("farmIsland", {
      diameterTop: 24.0,
      diameterBottom: 25.0,
      height: 1.2,
      tessellation: 32
    }, this.scene);
    island.position.y = 0.0;
    island.parent = this.group;
    island.receiveShadows = true;
    this.shadowCasters.push(island);

    const grassMat = new BABYLON.StandardMaterial("farmGrassMat", this.scene);
    grassMat.diffuseColor = BABYLON.Color3.FromHexString("#4caf50");
    grassMat.specularColor = new BABYLON.Color3(0, 0, 0); // Lambert 风格
    grassMat.flatShading = true;
    island.material = grassMat;

    // 2. 泥土层地基底座 (高度 1.5, Y = -1.35)
    const dirt = BABYLON.MeshBuilder.CreateCylinder("farmDirt", {
      diameterTop: 25.0,
      diameterBottom: 24.0,
      height: 1.5,
      tessellation: 32
    }, this.scene);
    dirt.position.y = -1.35;
    dirt.parent = this.group;
    
    const dirtMat = new BABYLON.StandardMaterial("farmDirtMat", this.scene);
    dirtMat.diffuseColor = BABYLON.Color3.FromHexString("#5d4037");
    dirtMat.specularColor = new BABYLON.Color3(0, 0, 0);
    dirtMat.flatShading = true;
    dirt.material = dirtMat;

    // 3. 散落的 6 块农田泥地格子 (Y = 0.6)
    const plotMat = new BABYLON.StandardMaterial("farmPlotMat", this.scene);
    plotMat.diffuseColor = BABYLON.Color3.FromHexString("#3e2723");
    plotMat.specularColor = new BABYLON.Color3(0, 0, 0);
    plotMat.flatShading = true;

    const borderMat = new BABYLON.StandardMaterial("farmBorderMat", this.scene);
    borderMat.diffuseColor = BABYLON.Color3.FromHexString("#795548");
    borderMat.specularColor = new BABYLON.Color3(0, 0, 0);
    borderMat.flatShading = true;

    const plotConfigs = [
      { x: -3.6, z: -2.2 }, { x: 0, z: -2.2 }, { x: 3.6, z: -2.2 },
      { x: -3.6, z: 2.2 },  { x: 0, z: 2.2 },  { x: 3.6, z: 2.2 }
    ];

    plotConfigs.forEach((cfg, idx) => {
      const plotGroup = new BABYLON.TransformNode(`plot_${idx}`, this.scene);
      plotGroup.position.set(cfg.x, 0.6, cfg.z);
      plotGroup.parent = this.group;

      // 泥土中心
      const dirtMesh = BABYLON.MeshBuilder.CreateBox("plotDirt", {
        width: 2.4,
        height: 0.02,
        depth: 2.4
      }, this.scene);
      dirtMesh.receiveShadows = true;
      dirtMesh.parent = plotGroup;
      dirtMesh.material = plotMat;

      // 木质边缘框 (4 根)
      const w1 = BABYLON.MeshBuilder.CreateBox("plotBorder1", {
        width: 2.6,
        height: 0.1,
        depth: 0.1
      }, this.scene);
      w1.position.set(0, 0.05, 1.25);
      w1.parent = plotGroup;
      w1.material = borderMat;
      this.shadowCasters.push(w1);

      const w2 = w1.clone("plotBorder2");
      w2.position.z = -1.25;
      w2.parent = plotGroup;
      this.shadowCasters.push(w2);

      const w3 = BABYLON.MeshBuilder.CreateBox("plotBorder3", {
        width: 0.1,
        height: 0.1,
        depth: 2.4
      }, this.scene);
      w3.position.set(1.25, 0.05, 0);
      w3.parent = plotGroup;
      w3.material = borderMat;
      this.shadowCasters.push(w3);

      const w4 = w3.clone("plotBorder4");
      w4.position.x = -1.25;
      w4.parent = plotGroup;
      this.shadowCasters.push(w4);

      // 植物生长挂载节点 (作为 TransformNode)
      const plantGroup = new BABYLON.TransformNode(`plantGroup_${idx}`, this.scene);
      plantGroup.position.set(0, 0, 0);
      plantGroup.parent = plotGroup;

      this.plots3D.push({
        x: cfg.x,
        z: cfg.z,
        plantGroup: plantGroup
      });
    });

    // 4. 周围木栅栏与树木装饰
    const trunkMat = new BABYLON.StandardMaterial("farmTrunkMat", this.scene);
    trunkMat.diffuseColor = BABYLON.Color3.FromHexString("#4e342e");
    trunkMat.specularColor = new BABYLON.Color3(0, 0, 0);

    const leavesMat = new BABYLON.StandardMaterial("farmLeavesMat", this.scene);
    leavesMat.diffuseColor = BABYLON.Color3.FromHexString("#1b5e20");
    leavesMat.specularColor = new BABYLON.Color3(0, 0, 0);
    leavesMat.flatShading = true;

    const treePositions = [
      { x: -8.0, z: -8.0 }, { x: 8.0, z: -8.0 }, { x: -8.0, z: 8.0 }, { x: 8.0, z: 8.0 }
    ];

    treePositions.forEach((pos, idx) => {
      const tree = new BABYLON.TransformNode(`tree_${idx}`, this.scene);
      tree.position.set(pos.x, 0.6, pos.z);
      tree.parent = this.group;

      // 树干
      const trunk = BABYLON.MeshBuilder.CreateCylinder("treeTrunk", {
        diameterTop: 0.24,
        diameterBottom: 0.32,
        height: 1.0,
        tessellation: 6
      }, this.scene);
      trunk.position.y = 0.5;
      trunk.parent = tree;
      trunk.material = trunkMat;
      this.shadowCasters.push(trunk);

      // 十二面体树叶 (使用 Polyhedron Type 1 对应 Dodecahedron)
      const leaves = BABYLON.MeshBuilder.CreatePolyhedron("treeLeaves", {
        type: 1,
        size: 0.6
      }, this.scene);
      leaves.position.y = 1.1;
      leaves.parent = tree;
      leaves.material = leavesMat;
      this.shadowCasters.push(leaves);
    });

    // 5. 农场地图碰撞体与交互点数据
    this.colliders = [
      { type: 'floor', worldX: 0, worldZ: 0, worldY: 0.6, radius: 12.0 }
    ];

    this.interactables = plotConfigs.map((cfg, idx) => {
      return {
        id: `farm_plot_${idx}`,
        name: '农田格子',
        x: cfg.x,
        y: 0.6,
        z: cfg.z,
        triggerRadius: 1.8
      };
    });
  }

  // 作物生成方法移入类中，使 main.js 更加清爽
  recreateCrop3D(plotIndex, seedId) {
    const plot3D = this.plots3D[plotIndex];
    if (!plot3D) return;

    // 清空 plantGroup 下的原有子节点
    const children = plot3D.plantGroup.getChildren();
    for (let i = children.length - 1; i >= 0; i--) {
      children[i].dispose();
    }

    if (!seedId) return;

    const plant = new BABYLON.TransformNode("cropPlant", this.scene);
    plant.parent = plot3D.plantGroup;

    const isSunflower = seedId === 'sunflower_seed';

    if (isSunflower) {
      // 茎
      const stem = BABYLON.MeshBuilder.CreateCylinder("stem", {
        diameterTop: 0.08,
        diameterBottom: 0.08,
        height: 0.7,
        tessellation: 6
      }, this.scene);
      stem.position.y = 0.35;
      stem.parent = plant;
      
      const stemMat = new BABYLON.StandardMaterial("stemMat", this.scene);
      stemMat.diffuseColor = BABYLON.Color3.FromHexString("#2e7d32");
      stemMat.specularColor = new BABYLON.Color3(0, 0, 0);
      stem.material = stemMat;
      this.shadowCasters.push(stem);

      // 花盘
      const head = BABYLON.MeshBuilder.CreateCylinder("head", {
        diameterTop: 0.4,
        diameterBottom: 0.4,
        height: 0.06,
        tessellation: 8
      }, this.scene);
      head.position.set(0, 0.7, 0.05);
      head.rotation.x = Math.PI / 4;
      head.parent = plant;

      const yellowMat = new BABYLON.StandardMaterial("yellowMat", this.scene);
      yellowMat.diffuseColor = BABYLON.Color3.FromHexString("#ffeb3b");
      yellowMat.specularColor = new BABYLON.Color3(0, 0, 0);
      head.material = yellowMat;
      this.shadowCasters.push(head);

      // 花蕊中心
      const center = BABYLON.MeshBuilder.CreateCylinder("center", {
        diameterTop: 0.2,
        diameterBottom: 0.2,
        height: 0.08,
        tessellation: 8
      }, this.scene);
      center.position.set(0, 0.72, 0.07);
      center.rotation.x = Math.PI / 4;
      center.parent = plant;

      const brownMat = new BABYLON.StandardMaterial("brownMat", this.scene);
      brownMat.diffuseColor = BABYLON.Color3.FromHexString("#5d4037");
      brownMat.specularColor = new BABYLON.Color3(0, 0, 0);
      center.material = brownMat;
      this.shadowCasters.push(center);

    } else {
      // 草莓 (Low-poly)
      // 矮茎与多片小绿叶
      const leafMat = new BABYLON.StandardMaterial("strawberryLeafMat", this.scene);
      leafMat.diffuseColor = BABYLON.Color3.FromHexString("#4caf50");
      leafMat.specularColor = new BABYLON.Color3(0, 0, 0);

      const leafConfigs = [
        { ry: 0, rx: 0.5 },
        { ry: Math.PI * 0.66, rx: 0.5 },
        { ry: Math.PI * 1.33, rx: 0.5 }
      ];

      leafConfigs.forEach((cfg, lIdx) => {
        const leaf = BABYLON.MeshBuilder.CreateBox(`leaf_${lIdx}`, {
          width: 0.16,
          height: 0.02,
          depth: 0.32
        }, this.scene);
        leaf.position.y = 0.05;
        leaf.rotation.y = cfg.ry;
        leaf.rotation.x = cfg.rx;
        leaf.parent = plant;
        leaf.material = leafMat;
      });

      // 果实 (红色的球形/双锥形)
      const berry = BABYLON.MeshBuilder.CreateSphere("berry", {
        diameter: 0.22,
        segments: 6
      }, this.scene);
      berry.position.set(0, 0.16, 0.05);
      berry.parent = plant;
      
      const berryMat = new BABYLON.StandardMaterial("berryMat", this.scene);
      berryMat.diffuseColor = BABYLON.Color3.FromHexString("#e53935");
      berryMat.specularColor = new BABYLON.Color3(0, 0, 0);
      berry.material = berryMat;
      this.shadowCasters.push(berry);
    }
  }

  getShadowCasters() {
    return this.shadowCasters;
  }
}
