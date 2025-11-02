import { loadModelWithPBR } from './loader.js';
import * as THREE from 'three';

/**
 * Загружает несколько копий модели в случайных позициях вокруг центра.
 *
 * @param {Object} options
 * @param {string} options.name - имя модели
 * @param {string} options.modelPath - путь к папке модели
 * @param {THREE.Scene} options.scene - сцена
 * @param {number} [options.count=10] - количество экземпляров
 * @param {number} [options.radius=10] - внешний радиус разброса
 * @param {number} [options.innerRadius=0] - внутренний радиус (внутрь не спавнить)
 * @param {number} [options.scale=1] - базовый масштаб
 * @param {boolean|Object} [options.randomScale=false] - включить рандомный масштаб (объект с лимитом или true)
 * @param {boolean} [options.randomRotation=true] - включить случайное вращение
 * @param {Object} [options.rotationLimits={x:0,y:Math.PI*2,z:0}] - ограничения вращения по осям
 * @param {number} [options.randomY=0] - максимальное отклонение по высоте (вверх/вниз)
 */
export async function loadModelsCluster({
  name,
  modelPath,
  scene,
  count = 10,
  radius = 10,
  innerRadius = 0,
  scale = 1,
  randomScale = false, // можно true или { limit: 0.3 }
  randomRotation = true,
  rotationLimits = { x: 0, y: Math.PI * 2, z: 0 },
  randomY = 0,
}) {
  // определяем лимит для масштаба
  const scaleLimit = typeof randomScale === 'object' && randomScale.limit ? randomScale.limit : 0.25;

  for (let i = 0; i < count; i++) {
    // Случайная точка в кольце между innerRadius и radius
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.sqrt(
      Math.random() * (radius * radius - innerRadius * innerRadius) + innerRadius * innerRadius
    );

    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    const y = (Math.random() - 0.5) * 2 * randomY; // разброс по высоте

    // Рандомное вращение с ограничениями
    const rotation = randomRotation
      ? [
          (Math.random() - 0.5) * 2 * rotationLimits.x,
          (Math.random() - 0.5) * 2 * rotationLimits.y,
          (Math.random() - 0.5) * 2 * rotationLimits.z,
        ]
      : [0, 0, 0];

    // Рандомный масштаб
    const scaleValue = randomScale
      ? scale * (1 + (Math.random() - 0.5) * 2 * scaleLimit)
      : scale;

    await loadModelWithPBR({
      name,
      modelPath,
      position: [x, y, z],
      rotation,
      scale: [scaleValue, scaleValue, scaleValue],
      scene,
    });
  }

  console.log(
    `✅ Cluster of "${name}" loaded (${count} models, inner radius ${innerRadius}, randomScale=${
      randomScale ? 'on' : 'off'
    })`
  );
}