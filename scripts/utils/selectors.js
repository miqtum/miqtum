// highlightAndDelete.js
import { Raycaster, Vector2, Color } from 'three';

export function highlightAndDelete({
    renderer,
    scene,
    camera,
    except = [],
    highlightColor = 0x00ff55,
    highlightIntensity = .5,
    removeDuration = 0.1
}) {

    const raycaster = new Raycaster();
    const pointer = new Vector2();

    let highlighted = null;
    const originalEmissive = new Map(); // храним эмиссив каждого объекта
    const originalMaterial = new Map();      // mesh.uuid -> original material
    const highlightedMaterials = new Map();  // mesh.uuid -> cloned highlight material

    let objectsToRemove = [];

    // ============================================================
    //  УТИЛИТЫ
    // ============================================================

    function setPointer(event) {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    function collectMeshes(root, list) {
        root.traverse(obj => {
            if (obj.isMesh) list.push(obj);
        });
        return list;
    }

    function getIntersectObject(event) {
        setPointer(event);
        raycaster.setFromCamera(pointer, camera);

        const intersects = raycaster.intersectObjects(scene.children, true);
        const hit = intersects.find(i => !except.includes(i.object.name));

        if (!hit) return null;

        // Если это инстансы
        if (hit.instanceId !== undefined) return hit;

        return hit.object;
    }

    // ============================================================
    //  ХАЙЛАЙТ
    // ============================================================

    function applyHighlight(target) {
        if (!target) return;

        const meshes = target.instanceId !== undefined
            ? [target.object]
            : collectMeshes(target, []);

        meshes.forEach(mesh => {
            if (!mesh.material) return;

            // если материал уже клонирован — не делаем повторно
            if (highlightedMaterials.has(mesh.uuid)) return;

            // создаём копию "на время подсветки"
            const cloned = mesh.material.clone();

            // изменяем emissive
            if (cloned.emissive) {
                cloned.emissive.set(highlightColor);
                cloned.emissiveIntensity = highlightIntensity;
            }

            // запоминаем исходный материал
            originalMaterial.set(mesh.uuid, mesh.material);

            // подменяем материал у меша
            mesh.material = cloned;

            // отмечаем, что этот меш использует выделенный материал
            highlightedMaterials.set(mesh.uuid, cloned);
        });
    }


    function removeHighlight(target) {
        if (!target) return;

        const meshes = target.instanceId !== undefined
            ? [target.object]
            : collectMeshes(target, []);

        meshes.forEach(mesh => {
            if (!highlightedMaterials.has(mesh.uuid)) return;

            const original = originalMaterial.get(mesh.uuid);

            // вернуть оригинальный материал
            mesh.material = original;

            // очистить записи
            highlightedMaterials.delete(mesh.uuid);
            originalMaterial.delete(mesh.uuid);
        });
    }


    // ============================================================
    //  АНИМАЦИЯ УДАЛЕНИЯ
    // ============================================================

    function animateRemoval(dt) {
        if (objectsToRemove.length === 0) return;

        for (let i = objectsToRemove.length - 1; i >= 0; i--) {
            const item = objectsToRemove[i];
            item.time += dt;

            let t = item.time / removeDuration;
            t = Math.min(t, 1);

            const s = 1 - t;
            item.obj.scale.setScalar(s);

            if (t >= 1) {
                scene.remove(item.obj);
                objectsToRemove.splice(i, 1);
            }
        }
    }

    // ============================================================
    //  СОБЫТИЯ
    // ============================================================

    function onPointerMove(e) {
        const hit = getIntersectObject(e);

        if (highlighted === hit) return;

        if (highlighted) removeHighlight(highlighted);
        highlighted = hit;
        if (highlighted) applyHighlight(highlighted);
    }

    function onPointerDown(e) {
        const hit = getIntersectObject(e);
        if (!hit) return;

        // сброс подсветки
        if (highlighted) {
            removeHighlight(highlighted);
            highlighted = null;
        }

        // InstancedMesh — удаляем целый объект
        const removeObj = hit.instanceId !== undefined ? hit.object : hit;

        objectsToRemove.push({ obj: removeObj, time: 0 });
    }

    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerdown", onPointerDown);

    // ============================================================
    //  РЕНДЕР
    // ============================================================

    let lastTime = performance.now();

    function render() {
        const now = performance.now();
        const dt = (now - lastTime) / 1000;
        lastTime = now;

        animateRemoval(dt);
        renderer.render(scene, camera);
    }

    return { render };
}