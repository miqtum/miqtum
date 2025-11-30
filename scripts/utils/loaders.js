// loaders.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * Загружает одну .glb модель в сцену с текстурами.
 * 
 * @param {Object} options
 * @param {string} options.modelPath - путь к папке с моделью (например '/miqtum/models')
 * @param {string} options.name - имя файла модели без расширения (например 'iphone')
 * @param {THREE.Scene} options.scene - объект сцены, куда добавить модель
 * @param {number[]} [options.position=[0,0,0]] - позиция модели (x, y, z)
 * @param {number[]} [options.rotation=[0,0,0]] - вращение в градусах (x, y, z)
 * @param {number} [options.scale=1] - единый множитель масштаба
 * 
 * @returns {Promise<THREE.Group>} - промис с добавленной моделью
 */
export async function loadGLBModel({
  modelPath,
  name,
  scene,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}) {
  if (!scene) {
    throw new Error('❌ Не передана сцена (scene) для добавления модели.');
  }

  const loader = new GLTFLoader();
  const filePath = `${modelPath}/${name}.glb`;

  console.log(`📦 Загрузка модели: ${filePath}`);

  const gltf = await loader.loadAsync(filePath);
  const model = gltf.scene;

  // --- применяем трансформации ---
  model.position.set(...position);

  const degToRad = (deg) => (deg * Math.PI) / 180;
  model.rotation.set(
    degToRad(rotation[0]),
    degToRad(rotation[1]),
    degToRad(rotation[2])
  );

  model.scale.set(scale, scale, scale);

  // --- корректно настраиваем материалы (если есть текстуры) ---
  model.traverse((obj) => {
    if (obj.isMesh && obj.material) {
      const mat = obj.material;
      mat.side = THREE.DoubleSide; // рендерить обе стороны (на случай неполных нормалей)

      // авто-детект sRGB
      if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;
      if (mat.emissiveMap) mat.emissiveMap.colorSpace = THREE.SRGBColorSpace;

      // для корректного отображения PBR
      if (mat.normalMap) mat.normalMap.flipY = false;
      if (mat.map) mat.map.flipY = false;
      mat.needsUpdate = true;
    }
  });

  // --- добавляем в сцену ---
  scene.add(model);

  console.log(`✅ Модель "${name}" добавлена в сцену`);
  return model;
}

/**
 * Загружает GLTF модель и добавляет анимированную текстуру из видео с настройкой UV
 * @param {string} modelUrl - URL GLTF модели
 * @param {string} videoUrl - URL видео файла для текстуры
 * @param {Object} position - Положение модели {x, y, z}
 * @param {Object} rotation - Поворот в градусах {x, y, z}
 * @param {number} scale - Масштаб модели
 * @param {Object} uvSettings - Настройки UV координат {offset: {x, y}, repeat: {x, y}, rotation: number, noTiling: boolean}
 * @returns {Promise<THREE.Group>} Promise с загруженной моделью
 */
export async function loadModelWthAnimTex(
  modelUrl,
  videoUrl,
  position,
  rotation,
  scale,
  uvSettings = {
    offset: { x: 0, y: 0 },
    repeat: { x: 1, y: 1 },
    rotation: 0,
    noTiling: true  // По умолчанию без тайлинга
  }
) {
  return new Promise((resolve, reject) => {
    // Создаем группу для модели
    const modelGroup = new THREE.Group();

    // Создаем видео элемент и текстуру
    const video = document.createElement('video');
    video.src = videoUrl;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';

    const videoTexture = new THREE.VideoTexture(video);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.format = THREE.RGBAFormat;

    // Применяем настройки UV к текстуре
    if (uvSettings.offset) {
      videoTexture.offset = new THREE.Vector2(uvSettings.offset.x, uvSettings.offset.y);
    }

    if (uvSettings.repeat) {
      videoTexture.repeat = new THREE.Vector2(uvSettings.repeat.x, uvSettings.repeat.y);
    }

    if (uvSettings.rotation !== undefined) {
      videoTexture.rotation = THREE.MathUtils.degToRad(uvSettings.rotation);
    }

    // Настройка wrapping в зависимости от noTiling
    if (uvSettings.noTiling) {
      videoTexture.wrapS = THREE.ClampToEdgeWrapping;
      videoTexture.wrapT = THREE.ClampToEdgeWrapping;
    } else {
      videoTexture.wrapS = THREE.RepeatWrapping;
      videoTexture.wrapT = THREE.RepeatWrapping;
    }

    // Загружаем модель
    const loader = new GLTFLoader();

    loader.load(
      modelUrl,
      (gltf) => {
        const model = gltf.scene;

        // Применяем трансформации
        model.position.set(position.x, position.y, position.z);

        // Конвертируем градусы в радианы для поворота
        model.rotation.set(
          THREE.MathUtils.degToRad(rotation.x),
          THREE.MathUtils.degToRad(rotation.y),
          THREE.MathUtils.degToRad(rotation.z)
        );

        model.scale.set(scale, scale, scale);

        // Применяем анимированную текстуру ко всем мешам
        model.traverse((child) => {
          if (child.isMesh) {
            // Сохраняем оригинальный материал
            const originalMaterial = child.material;
            child.userData.originalMaterial = originalMaterial;

            // Создаем материал для видео текстуры
            const videoMaterial = new THREE.MeshBasicMaterial({
              map: videoTexture,
              transparent: true,
              opacity: 1.0,
              side: THREE.DoubleSide,
              blending: THREE.NormalBlending,
              depthWrite: false
            });

            // Если noTiling true, используем оба материала (мультиматериал)
            if (uvSettings.noTiling) {
              // Создаем массив материалов: сначала оригинальный, затем видео
              child.material = [
                originalMaterial,    // Основной материал (нижний слой)
                videoMaterial        // Видео текстура (верхний слой)
              ];
            } else {
              // Если тайлинг включен, заменяем материал полностью
              child.material = videoMaterial;
            }

            // Сохраняем настройки UV для возможного изменения в реальном времени
            child.userData.uvSettings = uvSettings;
            child.userData.videoTexture = videoTexture;
            child.userData.videoMaterial = videoMaterial;
          }
        });

        // Добавляем модель в группу
        modelGroup.add(model);

        // Сохраняем ссылки для удобства
        modelGroup.userData = {
          model: model,
          video: video,
          videoTexture: videoTexture,
          originalGltf: gltf,
          uvSettings: uvSettings
        };

        // Запускаем видео когда оно готово
        video.addEventListener('loadeddata', () => {
          video.play().then(() => {
            resolve(modelGroup);
          }).catch(error => {
            console.warn('Автовоспроизведение видео заблокировано:', error);
            resolve(modelGroup);
          });
        });

        video.load();
      },
      (progress) => {
        // Прогресс загрузки можно обработать здесь
        console.log(`Загрузка модели: ${(progress.loaded / progress.total * 100).toFixed(2)}%`);
      },
      (error) => {
        reject(new Error(`Ошибка загрузки модели: ${error.message}`));
      }
    );
  });
}

// Дополнительные утилиты для управления моделью и UV координатами
export const ModelWthAnimTexUtils = {
  /**
   * Запускает/останавливает анимацию видео
   * @param {THREE.Group} modelGroup - Группа модели
   * @param {boolean} play - true для воспроизведения, false для паузы
   */
  toggleVideoAnimation(modelGroup, play = true) {
    if (modelGroup.userData.video) {
      if (play) {
        modelGroup.userData.video.play();
      } else {
        modelGroup.userData.video.pause();
      }
    }
  },

  /**
   * Сбрасывает видео на начало
   * @param {THREE.Group} modelGroup - Группа модели
   */
  resetVideoAnimation(modelGroup) {
    if (modelGroup.userData.video) {
      modelGroup.userData.video.currentTime = 0;
    }
  },

  /**
   * Восстанавливает оригинальные материалы модели
   * @param {THREE.Group} modelGroup - Группа модели
   */
  restoreOriginalMaterials(modelGroup) {
    modelGroup.traverse((child) => {
      if (child.isMesh && child.userData.originalMaterial) {
        child.material = child.userData.originalMaterial;
      }
    });
  },

  /**
   * Устанавливает прозрачность видео текстуры
   * @param {THREE.Group} modelGroup - Группа модели
   * @param {number} opacity - Прозрачность от 0 до 1
   */
  setVideoOpacity(modelGroup, opacity) {
    modelGroup.traverse((child) => {
      if (child.isMesh && child.userData.videoMaterial) {
        child.userData.videoMaterial.opacity = opacity;
        child.userData.videoMaterial.transparent = opacity < 1.0;
      }
    });
  },

  /**
   * Переключает режим тайлинга
   * @param {THREE.Group} modelGroup - Группа модели
   * @param {boolean} noTiling - true для отключения тайлинга, false для включения
   */
  setTilingMode(modelGroup, noTiling) {
    modelGroup.traverse((child) => {
      if (child.isMesh && child.userData.videoTexture && child.userData.originalMaterial) {
        const texture = child.userData.videoTexture;

        // Обновляем wrapping
        if (noTiling) {
          texture.wrapS = THREE.ClampToEdgeWrapping;
          texture.wrapT = THREE.ClampToEdgeWrapping;
        } else {
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.RepeatWrapping;
        }

        // Обновляем материал в зависимости от режима
        if (noTiling && !Array.isArray(child.material)) {
          // Переключаемся на многослойный материал
          child.material = [
            child.userData.originalMaterial,
            child.userData.videoMaterial
          ];
        } else if (!noTiling && Array.isArray(child.material)) {
          // Переключаемся на одинарный материал с видео
          child.material = child.userData.videoMaterial;
        }

        texture.needsUpdate = true;
        child.userData.uvSettings.noTiling = noTiling;
      }
    });

    modelGroup.userData.uvSettings.noTiling = noTiling;
  },

  /**
   * Обновляет UV параметры текстуры в реальном времени
   * @param {THREE.Group} modelGroup - Группа модели
   * @param {Object} uvSettings - Новые настройки UV {offset: {x, y}, repeat: {x, y}, rotation: number, noTiling: boolean}
   */
  updateUVSettings(modelGroup, uvSettings) {
    modelGroup.traverse((child) => {
      if (child.isMesh && child.userData.videoTexture) {
        const texture = child.userData.videoTexture;

        if (uvSettings.offset) {
          texture.offset.set(uvSettings.offset.x, uvSettings.offset.y);
        }

        if (uvSettings.repeat) {
          texture.repeat.set(uvSettings.repeat.x, uvSettings.repeat.y);
        }

        if (uvSettings.rotation !== undefined) {
          texture.rotation = THREE.MathUtils.degToRad(uvSettings.rotation);
        }

        if (uvSettings.noTiling !== undefined) {
          AnimatedModelUtils.setTilingMode(modelGroup, uvSettings.noTiling);
        }

        texture.needsUpdate = true;
        child.userData.uvSettings = { ...child.userData.uvSettings, ...uvSettings };
      }
    });

    // Обновляем настройки в userData группы
    modelGroup.userData.uvSettings = { ...modelGroup.userData.uvSettings, ...uvSettings };
  },

  /**
   * Сдвигает текстуру по UV координатам
   * @param {THREE.Group} modelGroup - Группа модели
   * @param {number} u - Смещение по U
   * @param {number} v - Смещение по V
   */
  offsetTexture(modelGroup, u, v) {
    AnimatedModelUtils.updateUVSettings(modelGroup, {
      offset: { x: u, y: v }
    });
  },

  /**
   * Масштабирует текстуру по UV координатам
   * @param {THREE.Group} modelGroup - Группа модели
   * @param {number} scaleU - Масштаб по U
   * @param {number} scaleV - Масштаб по V
   */
  scaleTexture(modelGroup, scaleU, scaleV) {
    AnimatedModelUtils.updateUVSettings(modelGroup, {
      repeat: { x: scaleU, y: scaleV }
    });
  },

  /**
   * Поворачивает текстуру
   * @param {THREE.Group} modelGroup - Группа модели
   * @param {number} degrees - Угол поворота в градусах
   */
  rotateTexture(modelGroup, degrees) {
    AnimatedModelUtils.updateUVSettings(modelGroup, {
      rotation: degrees
    });
  }
};

export async function loadAnimatedModelSimple(
  modelUrl,
  videoUrl,
  position,
  rotation,
  scale,
  uvSettings = {
    offset: { x: 0, y: 0 },
    repeat: { x: 1, y: 1 },
    rotation: 0,
    noTiling: true
  }
) {
  return new Promise((resolve, reject) => {
    const modelGroup = new THREE.Group();

    const video = document.createElement('video');
    video.src = videoUrl;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';

    const videoTexture = new THREE.VideoTexture(video);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;

    // Применяем UV настройки
    if (uvSettings.offset) {
      videoTexture.offset.set(uvSettings.offset.x, uvSettings.offset.y);
    }
    if (uvSettings.repeat) {
      videoTexture.repeat.set(uvSettings.repeat.x, uvSettings.repeat.y);
    }
    if (uvSettings.rotation !== undefined) {
      videoTexture.rotation = THREE.MathUtils.degToRad(uvSettings.rotation);
    }

    // Настройка wrapping
    videoTexture.wrapS = uvSettings.noTiling ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
    videoTexture.wrapT = uvSettings.noTiling ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;

    const loader = new GLTFLoader();

    loader.load(
      modelUrl,
      (gltf) => {
        const model = gltf.scene;

        model.position.set(position.x, position.y, position.z);
        model.rotation.set(
          THREE.MathUtils.degToRad(rotation.x),
          THREE.MathUtils.degToRad(rotation.y),
          THREE.MathUtils.degToRad(rotation.z)
        );
        model.scale.set(scale, scale, scale);

        model.traverse((child) => {
          if (child.isMesh) {
            const originalMaterial = child.material;
            child.userData.originalMaterial = originalMaterial;

            if (uvSettings.noTiling && originalMaterial.isMaterial) {
              // Создаем копию оригинального материала
              const newMaterial = originalMaterial.clone();

              // Добавляем видео текстуру как emissive карту для свечения
              newMaterial.emissiveMap = videoTexture;
              newMaterial.emissive = new THREE.Color(0xffffff);

              // Настраиваем смешивание
              newMaterial.transparent = true;

              child.material = newMaterial;

            } else {
              // Заменяем материал полностью
              const videoMaterial = new THREE.MeshBasicMaterial({
                map: videoTexture,
                transparent: true,
                side: THREE.DoubleSide
              });
              child.material = videoMaterial;
            }

            child.userData.uvSettings = uvSettings;
            child.userData.videoTexture = videoTexture;
          }
        });

        modelGroup.add(model);
        modelGroup.userData = {
          model: model,
          video: video,
          videoTexture: videoTexture,
          originalGltf: gltf,
          uvSettings: uvSettings
        };

        video.addEventListener('loadeddata', () => {
          video.play().then(() => {
            resolve(modelGroup);
          }).catch(error => {
            console.warn('Автовоспроизведение видео заблокировано:', error);
            resolve(modelGroup);
          });
        });

        video.load();
      },
      null,
      reject
    );
  });
}


/**
 * Загружает GLTF модель и применяет видео текстуру к конкретному материалу по имени
 * @param {string} modelUrl - URL GLTF модели
 * @param {string} videoUrl - URL видео файла для текстуры
 * @param {string} targetMaterialName - Имя материала, к которому применять видео текстуру
 * @param {Object} position - Положение модели {x, y, z}
 * @param {Object} rotation - Поворот в градусах {x, y, z}
 * @param {number} scale - Масштаб модели
 * @param {Object} textureSettings - Настройки текстуры {offset: {x, y}, repeat: {x, y}, rotation: number, noTiling: boolean, blendMode: string}
 * @returns {Promise<THREE.Group>} Promise с загруженной моделью
 */
export async function loadAnimatedModelByMaterial(
  modelUrl,
  videoUrl,
  targetMaterialName,
  position = { x: 0, y: 0, z: 0 },
  rotation = { x: 0, y: 0, z: 0 },
  scale = 1,
  textureSettings = {
    offset: { x: 0, y: 0 },
    repeat: { x: 1, y: 1 },
    rotation: 0,
    noTiling: true,
    blendMode: 'emissive' // 'emissive', 'diffuse', 'overlay'
  }
) {
  return new Promise((resolve, reject) => {
    const modelGroup = new THREE.Group();

    // Создаем видео элемент и текстуру
    const video = document.createElement('video');
    video.src = videoUrl;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';

    const videoTexture = new THREE.VideoTexture(video);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.format = THREE.RGBAFormat;

    // Применяем настройки текстуры
    if (textureSettings.offset) {
      videoTexture.offset.set(textureSettings.offset.x, textureSettings.offset.y);
    }

    if (textureSettings.repeat) {
      videoTexture.repeat.set(textureSettings.repeat.x, textureSettings.repeat.y);
    }

    if (textureSettings.rotation !== undefined) {
      videoTexture.rotation = THREE.MathUtils.degToRad(textureSettings.rotation);
    }

    // Настройка wrapping
    videoTexture.wrapS = textureSettings.noTiling ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
    videoTexture.wrapT = textureSettings.noTiling ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;

    const loader = new GLTFLoader();

    loader.load(
      modelUrl,
      (gltf) => {
        const model = gltf.scene;
        let targetMaterialFound = false;

        // Применяем трансформации
        model.position.set(position.x, position.y, position.z);
        model.rotation.set(
          THREE.MathUtils.degToRad(rotation.x),
          THREE.MathUtils.degToRad(rotation.y),
          THREE.MathUtils.degToRad(rotation.z)
        );
        model.scale.set(scale, scale, scale);

        // Ищем и модифицируем целевой материал
        model.traverse((child) => {
          if (child.isMesh && child.material) {
            const materials = Array.isArray(child.material) ? child.material : [child.material];

            materials.forEach((material, index) => {
              if (material.name === targetMaterialName ||
                child.name === targetMaterialName ||
                material.userData.name === targetMaterialName) {

                targetMaterialFound = true;

                // Сохраняем оригинальный материал
                if (!material.userData.originalMaterial) {
                  material.userData.originalMaterial = {
                    map: material.map,
                    emissiveMap: material.emissiveMap,
                    emissive: material.emissive ? material.emissive.clone() : new THREE.Color(0x000000),
                    emissiveIntensity: material.emissiveIntensity || 1.0
                  };
                }

                // Применяем видео текстуру в зависимости от режима смешивания
                switch (textureSettings.blendMode) {
                  case 'diffuse':
                    // Заменяем диффузную текстуру
                    material.map = videoTexture;
                    material.needsUpdate = true;
                    break;

                  case 'overlay':
                    // Наложение поверх существующей текстуры
                    material.emissiveMap = videoTexture;
                    material.emissive = new THREE.Color(0xffffff);
                    material.emissiveIntensity = 1.0;
                    break;

                  case 'emissive':
                  default:
                    // Добавляем как карту свечения (рекомендуется)
                    material.emissiveMap = videoTexture;
                    material.emissive = new THREE.Color(0xffffff);
                    material.emissiveIntensity = 1.0;
                    break;
                }

                // Сохраняем ссылки для управления
                material.userData.videoTexture = videoTexture;
                material.userData.textureSettings = textureSettings;
                material.userData.isAnimatedMaterial = true;

                console.log(`Применена видео текстура к материалу: ${targetMaterialName}`);
              }
            });

            // Обновляем материал если он был изменен
            if (Array.isArray(child.material)) {
              child.material = [...child.material];
            } else {
              child.material.needsUpdate = true;
            }

            // Сохраняем ссылки на уровне меша
            child.userData.targetMaterialName = targetMaterialName;
          }
        });

        if (!targetMaterialFound) {
          console.warn(`Материал с именем "${targetMaterialName}" не найден. Доступные материалы:`);
          model.traverse((child) => {
            if (child.isMesh && child.material) {
              const materials = Array.isArray(child.material) ? child.material : [child.material];
              materials.forEach(material => {
                console.log(`- ${material.name || 'unnamed'} (меш: ${child.name || 'unnamed'})`);
              });
            }
          });
        }

        // Добавляем модель в группу
        modelGroup.add(model);

        // Сохраняем ссылки для управления
        modelGroup.userData = {
          model: model,
          video: video,
          videoTexture: videoTexture,
          originalGltf: gltf,
          targetMaterialName: targetMaterialName,
          textureSettings: textureSettings,
          targetMaterialFound: targetMaterialFound
        };

        // Запускаем видео
        video.addEventListener('loadeddata', () => {
          video.play().then(() => {
            resolve(modelGroup);
          }).catch(error => {
            console.warn('Автовоспроизведение видео заблокировано:', error);
            resolve(modelGroup);
          });
        });

        video.addEventListener('error', (error) => {
          console.error('Ошибка загрузки видео:', error);
          resolve(modelGroup); // Все равно разрешаем промис, но без видео
        });

        video.load();
      },
      (progress) => {
        console.log(`Загрузка модели: ${(progress.loaded / progress.total * 100).toFixed(2)}%`);
      },
      (error) => {
        reject(new Error(`Ошибка загрузки модели: ${error.message}`));
      }
    );
  });
}

// Утилиты для управления анимированными материалами
export const AnimatedMaterialUtils = {
  /**
   * Запускает/останавливает анимацию видео
   * @param {THREE.Group} modelGroup - Группа модели
   * @param {boolean} play - true для воспроизведения, false для паузы
   */
  toggleVideoAnimation(modelGroup, play = true) {
    if (modelGroup.userData.video) {
      if (play) {
        modelGroup.userData.video.play();
      } else {
        modelGroup.userData.video.pause();
      }
    }
  },

  /**
   * Сбрасывает видео на начало
   * @param {THREE.Group} modelGroup - Группа модели
   */
  resetVideoAnimation(modelGroup) {
    if (modelGroup.userData.video) {
      modelGroup.userData.video.currentTime = 0;
    }
  },

  /**
   * Восстанавливает оригинальные материалы
   * @param {THREE.Group} modelGroup - Группа модели
   */
  restoreOriginalMaterials(modelGroup) {
    modelGroup.traverse((child) => {
      if (child.isMesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];

        materials.forEach(material => {
          if (material.userData.originalMaterial) {
            material.map = material.userData.originalMaterial.map;
            material.emissiveMap = material.userData.originalMaterial.emissiveMap;
            material.emissive = material.userData.originalMaterial.emissive;
            material.emissiveIntensity = material.userData.originalMaterial.emissiveIntensity;
            material.needsUpdate = true;
          }
        });
      }
    });
  },

  /**
   * Устанавливает интенсивность свечения видео текстуры
   * @param {THREE.Group} modelGroup - Группа модели
   * @param {number} intensity - Интенсивность от 0 до 1
   */
  setVideoIntensity(modelGroup, intensity) {
    modelGroup.traverse((child) => {
      if (child.isMesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];

        materials.forEach(material => {
          if (material.userData.isAnimatedMaterial) {
            material.emissiveIntensity = intensity;
          }
        });
      }
    });
  },

  /**
   * Обновляет настройки текстуры в реальном времени
   * @param {THREE.Group} modelGroup - Группа модели
   * @param {Object} textureSettings - Новые настройки текстуры
   */
  updateTextureSettings(modelGroup, textureSettings) {
    modelGroup.traverse((child) => {
      if (child.isMesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];

        materials.forEach(material => {
          if (material.userData.videoTexture) {
            const texture = material.userData.videoTexture;

            if (textureSettings.offset) {
              texture.offset.set(textureSettings.offset.x, textureSettings.offset.y);
            }

            if (textureSettings.repeat) {
              texture.repeat.set(textureSettings.repeat.x, textureSettings.repeat.y);
            }

            if (textureSettings.rotation !== undefined) {
              texture.rotation = THREE.MathUtils.degToRad(textureSettings.rotation);
            }

            if (textureSettings.noTiling !== undefined) {
              texture.wrapS = textureSettings.noTiling ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
              texture.wrapT = textureSettings.noTiling ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
            }

            texture.needsUpdate = true;
            material.userData.textureSettings = { ...material.userData.textureSettings, ...textureSettings };
          }
        });
      }
    });

    modelGroup.userData.textureSettings = { ...modelGroup.userData.textureSettings, ...textureSettings };
  },

  /**
   * Получает список всех материалов в модели
   * @param {THREE.Group} modelGroup - Группа модели
   * @returns {Array} Массив имен материалов
   */
  getMaterialNames(modelGroup) {
    const materialNames = new Set();

    modelGroup.traverse((child) => {
      if (child.isMesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach(material => {
          if (material.name) {
            materialNames.add(material.name);
          }
        });
      }
    });

    return Array.from(materialNames);
  },

  /**
   * Применяет видео текстуру к другому материалу в уже загруженной модели
   * @param {THREE.Group} modelGroup - Группа модели
   * @param {string} newTargetMaterialName - Имя нового целевого материала
   * @param {Object} textureSettings - Настройки текстуры
   */
  changeTargetMaterial(modelGroup, newTargetMaterialName, textureSettings = null) {
    // Сначала восстанавливаем оригинальные материалы
    this.restoreOriginalMaterials(modelGroup);

    // Затем применяем к новому материалу
    modelGroup.traverse((child) => {
      if (child.isMesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];

        materials.forEach((material, index) => {
          if (material.name === newTargetMaterialName) {
            const settings = textureSettings || modelGroup.userData.textureSettings;
            const videoTexture = modelGroup.userData.videoTexture;

            material.userData.originalMaterial = {
              map: material.map,
              emissiveMap: material.emissiveMap,
              emissive: material.emissive ? material.emissive.clone() : new THREE.Color(0x000000),
              emissiveIntensity: material.emissiveIntensity || 1.0
            };

            material.emissiveMap = videoTexture;
            material.emissive = new THREE.Color(0xffffff);
            material.emissiveIntensity = 1.0;
            material.userData.videoTexture = videoTexture;
            material.userData.textureSettings = settings;
            material.userData.isAnimatedMaterial = true;

            material.needsUpdate = true;

            console.log(`Видео текстура применена к новому материалу: ${newTargetMaterialName}`);
          }
        });
      }
    });

    modelGroup.userData.targetMaterialName = newTargetMaterialName;
    if (textureSettings) {
      modelGroup.userData.textureSettings = textureSettings;
    }
  }
};


export async function randomScatterGLB({
  url,
  scene,
  minRadius = 0,
  maxRadius = 10,
  maxHeight = 0,
  rotationLimits = { x: 0, y: 0, z: 0 }, // ° degrees
  scaleLimits = { min: 1, max: 1 },
  maxAttempts = 50 // попыток для поиска места без пересечений
}) {
  const loader = new GLTFLoader();

  const gltf = await loader.loadAsync(url);
  const root = gltf.scene;

  const meshes = [];
  root.traverse(obj => {
    if (obj.isMesh) meshes.push(obj);
  });

  const placedObjects = []; // для проверки пересечений

  function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
  }

  function degToRad(d) {
    return d * Math.PI / 180;
  }

  // создаём bounding box с учётом поворота и скейла
  function computeBoundingBox(obj) {
    const box = new THREE.Box3().setFromObject(obj);
    return box;
  }

  function intersectsAny(box) {
    return placedObjects.some(other => box.intersectsBox(other));
  }

  meshes.forEach(originalMesh => {
    // Клонируем меш чтобы не мутировать исходный
    const mesh = originalMesh.clone(true);

    let attempts = 0;
    let placed = false;

    while (!placed && attempts < maxAttempts) {
      attempts++;

      // ------------------------------
      // 1. СЛУЧАЙНАЯ ПОЗИЦИЯ (кольцевой диапазон)
      // ------------------------------
      const angle = Math.random() * Math.PI * 2;
      const radius = randomBetween(minRadius, maxRadius);

      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = randomBetween(0, maxHeight);

      mesh.position.set(x, y, z);

      // ------------------------------
      // 2. СЛУЧАЙНЫЙ ПОВОРОТ
      // ------------------------------
      mesh.rotation.set(
        degToRad(randomBetween(-rotationLimits.x, rotationLimits.x)),
        degToRad(randomBetween(-rotationLimits.y, rotationLimits.y)),
        degToRad(randomBetween(-rotationLimits.z, rotationLimits.z))
      );

      // ------------------------------
      // 3. СЛУЧАЙНЫЙ СКЕЙЛ
      // ------------------------------
      const scl = randomBetween(scaleLimits.min, scaleLimits.max);
      mesh.scale.setScalar(scl);

      // ------------------------------
      // 4. ПРОВЕРКА BOUNDING BOX
      // ------------------------------
      const box = computeBoundingBox(mesh);

      if (!intersectsAny(box)) {
        placedObjects.push(box);
        scene.add(mesh);
        placed = true;
      }
    }

    if (!placed) {
      console.warn("Не удалось разместить меш без пересечения:", originalMesh.name);
    }
  });
}

export async function randomScatterInstances({
  url,
  scene,
  count = 20,
  minRadius = 0,
  maxRadius = 10,
  maxHeight = 0,
  rotationLimits = { x: 0, y: 0, z: 0 },
  scaleLimits = { min: 1, max: 1 },
  maxAttempts = 50
}) {
  const loader = new GLTFLoader();

  // ---------------------------------------------------------
  // КЭШИРУЕМ МАТЕРИАЛЫ И ТЕКСТУРЫ — РАЗ ЛОАДИТСЯ, РАЗ ИСПОЛЬЗУЕТСЯ
  // ---------------------------------------------------------
  const materialCache = new Map();

  function cloneMaterialCached(mat) {
    if (materialCache.has(mat.uuid)) return materialCache.get(mat.uuid);
    const cloned = mat.clone();
    materialCache.set(mat.uuid, cloned);
    return cloned;
  }

  const gltf = await loader.loadAsync(url);
  const root = gltf.scene;

  // 1 меш — источник для инстансов
  let sourceMesh = null;
  root.traverse(o => {
    if (o.isMesh && !sourceMesh) sourceMesh = o;
  });

  if (!sourceMesh) {
    console.error("GLB не содержит мешей.");
    return;
  }

  // клонируем материал один раз (с кэшом внутри)
  sourceMesh.material = cloneMaterialCached(sourceMesh.material);

  const placedBoxes = [];

  function rand(min, max) { return Math.random() * (max - min) + min; }
  const deg = d => d * Math.PI / 180;

  function computeBox(obj) {
    return new THREE.Box3().setFromObject(obj);
  }

  function intersects(box) {
    return placedBoxes.some(b => box.intersectsBox(b));
  }

  // ---------------------------------------------------------
  // ГЕНЕРАЦИЯ ИНСТАНСОВ
  // ---------------------------------------------------------
  for (let i = 0; i < count; i++) {
    const inst = sourceMesh.clone(true);
    inst.material = cloneMaterialCached(sourceMesh.material);

    let placed = false;
    let tries = 0;

    while (!placed && tries++ < maxAttempts) {
      // случайная позиция
      const angle = Math.random() * Math.PI * 2;
      const radius = rand(minRadius, maxRadius);

      inst.position.set(
        Math.cos(angle) * radius,
        rand(0, maxHeight),
        Math.sin(angle) * radius
      );

      // случайный поворот
      inst.rotation.set(
        deg(rand(-rotationLimits.x, rotationLimits.x)),
        deg(rand(-rotationLimits.y, rotationLimits.y)),
        deg(rand(-rotationLimits.z, rotationLimits.z))
      );

      // случайный скейл
      const s = rand(scaleLimits.min, scaleLimits.max);
      inst.scale.setScalar(s);

      // проверяем пересечения
      const box = computeBox(inst);
      if (!intersects(box)) {
        placedBoxes.push(box);
        placed = true;
        scene.add(inst);
      }
    }

    if (!placed) {
      console.warn("Не нашёл место для инстанса", i);
    }
  }
}


