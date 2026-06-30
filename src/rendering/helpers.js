import * as BABYLON from '@babylonjs/core';

/**
 * 共享 Babylon 渲染辅助工具（Task 3.3）。
 * 集中颜色转换、flat material、mesh 释放、阴影注册、glow 过滤与 3D→屏幕投影，
 * 替代散落在 `main.js` 与世界模块中的重复实现。
 */

/** 十六进制（数字或字符串）转 Babylon Color3。 */
export function convertColor(hexVal) {
  if (typeof hexVal === 'number') {
    const hexStr = "#" + hexVal.toString(16).padStart(6, '0');
    return BABYLON.Color3.FromHexString(hexStr);
  }
  if (typeof hexVal === 'string') {
    if (!hexVal.startsWith('#')) return BABYLON.Color3.FromHexString('#' + hexVal);
    return BABYLON.Color3.FromHexString(hexVal);
  }
  return new BABYLON.Color3(1, 1, 1);
}

/** 创建低光泽 flat-shading 标准材质。 */
export function createFlatMaterial(scene, name, colorHex) {
  const mat = new BABYLON.StandardMaterial(name, scene);
  mat.diffuseColor = convertColor(colorHex);
  mat.specularColor = new BABYLON.Color3(0, 0, 0);
  mat.flatShading = true;
  return mat;
}

/** 安全释放 mesh（容错 null）。 */
export function disposeMesh(mesh) {
  if (mesh && typeof mesh.dispose === 'function') mesh.dispose();
}

/** 释放节点的全部子节点。 */
export function disposeChildren(node) {
  if (!node || typeof node.getChildren !== 'function') return;
  node.getChildren().forEach((child) => child.dispose());
}

/** 将 mesh 注册为阴影投射体（environment 缺省阴影生成器时静默跳过）。 */
export function registerShadowCaster(environment, mesh, includeDescendants = true) {
  if (environment && environment.shadowGenerator && mesh) {
    environment.shadowGenerator.addShadowCaster(mesh, includeDescendants);
  }
}

/**
 * 选择性辉光发射色选择器。
 * 排除水体、天气粒子、踩水波纹、樱花瓣、胡须等非霓虹装饰，避免大面积刺眼发光。
 */
export function createGlowEmissiveSelector() {
  return (mesh, subMesh, material, result) => {
    if (material) {
      const matName = material.name.toLowerCase();
      const isExcluded =
        matName.indexOf("water") !== -1 ||
        matName.indexOf("sea") !== -1 ||
        matName.indexOf("ocean") !== -1 ||
        matName.indexOf("spout") !== -1 ||
        matName.indexOf("ripple") !== -1 ||
        matName.indexOf("sakura") !== -1 ||
        matName.indexOf("petal") !== -1 ||
        matName.indexOf("whisker") !== -1 ||
        matName.indexOf("particle") !== -1 ||
        matName.indexOf("bubble") !== -1 ||
        matName.indexOf("snow") !== -1 ||
        matName.indexOf("fountain") !== -1;

      if (!isExcluded) {
        result.copyFrom(material.emissiveColor || material.diffuseColor);
        return;
      }
    }
    result.set(0, 0, 0);
  };
}

/** 将 3D 世界坐标投影到 2D 屏幕坐标（用于 DOM 气泡/菜单定位）。 */
export function projectToScreen(scene, camera, worldPos) {
  return BABYLON.Vector3.Project(
    worldPos,
    BABYLON.Matrix.Identity(),
    scene.getTransformMatrix(),
    camera.viewport.toGlobal(window.innerWidth, window.innerHeight)
  );
}
