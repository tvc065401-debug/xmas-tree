import React, { useMemo, useRef, useState, useLayoutEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { NEEDLE_COUNT, ORNAMENT_COUNT, TREE_HEIGHT, TREE_RADIUS, COLORS } from '../constants';
import { TreeMode } from '../types';

interface TreeProps {
  mode: TreeMode;
}

const tempObject = new THREE.Object3D();
const tempColor = new THREE.Color();

// Helper to generate distribution data
const generateOrnamentData = (count: number, scaleMultiplier: number = 1.0) => {
    const data = [];
    const palette = [COLORS.GOLD, COLORS.RED_VELVET, COLORS.ROYAL_BLUE, COLORS.SILVER, COLORS.GOLD];
    
    for (let i = 0; i < count; i++) {
      const y = Math.random() * TREE_HEIGHT;
      const radiusAtY = ((TREE_HEIGHT - y) / TREE_HEIGHT) * TREE_RADIUS;
      // Push to surface but allow some depth variation
      const r = radiusAtY * (0.85 + Math.random() * 0.25); 
      const theta = Math.random() * Math.PI * 2;
      
      const x = r * Math.cos(theta);
      const z = r * Math.sin(theta);
      
      const dir = new THREE.Vector3(x, y, z).normalize().multiplyScalar(Math.random() * 8 + 5);

      data.push({
        initialPos: new THREE.Vector3(x, y - 5, z),
        scale: (Math.random() * 0.4 + 0.3) * scaleMultiplier,
        color: palette[Math.floor(Math.random() * palette.length)],
        velocity: dir,
        rotationSpeed: new THREE.Euler(Math.random(), Math.random(), Math.random())
      });
    }
    return data;
};

export const Tree: React.FC<TreeProps> = ({ mode }) => {
  const needlesRef = useRef<THREE.InstancedMesh>(null);
  
  // Refs for different ornament types
  const glossyRef = useRef<THREE.InstancedMesh>(null);
  const matteRef = useRef<THREE.InstancedMesh>(null);
  const icicleRef = useRef<THREE.InstancedMesh>(null);
  
  const groupRef = useRef<THREE.Group>(null);
  const initialized = useRef(false);
  
  // --- HAT STATE ---
  const hatGroupRef = useRef<THREE.Group>(null);
  
  // --- DATA GENERATION ---
  const needleData = useMemo(() => {
    const data = [];
    for (let i = 0; i < NEEDLE_COUNT; i++) {
      const y = Math.random() * TREE_HEIGHT;
      // Cone shape logic
      const radiusAtY = ((TREE_HEIGHT - y) / TREE_HEIGHT) * TREE_RADIUS;
      const r = Math.random() * radiusAtY; 
      const theta = Math.random() * Math.PI * 2;
      
      const x = r * Math.cos(theta);
      const z = r * Math.sin(theta);
      
      // Explosion direction
      const dir = new THREE.Vector3(x, y, z).normalize().multiplyScalar(Math.random() * 5 + 2);

      data.push({
        initialPos: new THREE.Vector3(x, y - 5, z), // Offset y to center vertically
        rotation: new THREE.Euler(Math.random() * 0.5, Math.random() * Math.PI * 2, 0),
        scale: Math.random() * 0.5 + 0.5,
        velocity: dir
      });
    }
    return data;
  }, []);

  // Split ORNAMENT_COUNT into groups
  const counts = useMemo(() => ({
      glossy: Math.floor(ORNAMENT_COUNT * 0.5),
      matte: Math.floor(ORNAMENT_COUNT * 0.3),
      icicle: Math.floor(ORNAMENT_COUNT * 0.2),
  }), []);

  const glossyData = useMemo(() => generateOrnamentData(counts.glossy), [counts.glossy]);
  const matteData = useMemo(() => generateOrnamentData(counts.matte), [counts.matte]);
  // Use mostly Silver/White for icicles
  const icicleData = useMemo(() => {
      const data = generateOrnamentData(counts.icicle, 1.2); 
      // Override colors for icicles to be icy
      return data.map(d => ({ ...d, color: Math.random() > 0.5 ? '#ffffff' : '#dbeafe' }));
  }, [counts.icicle]);

  // --- ANIMATION STATE ---
  const [currentFactor, setCurrentFactor] = useState(0);

  // Hat specific Disperse Data
  const hatDisperseData = useMemo(() => {
      return {
          velocity: new THREE.Vector3(0, 8, 2), // Fly up and slightly forward
          rotationAxis: new THREE.Vector3(1, 0.5, 0).normalize()
      }
  }, []);


  // --- UPDATE LOGIC ---
  const updateMatrices = useCallback((factor: number) => {
    // Update Needles
    if (needlesRef.current) {
      let i = 0;
      for (const d of needleData) {
        const x = d.initialPos.x + d.velocity.x * factor * 3;
        const y = d.initialPos.y + d.velocity.y * factor * 3;
        const z = d.initialPos.z + d.velocity.z * factor * 3;
        
        tempObject.position.set(x, y, z);
        tempObject.rotation.set(
            d.rotation.x + factor, 
            d.rotation.y + factor, 
            d.rotation.z
        );
        const s = d.scale * (1 - factor * 0.8);
        tempObject.scale.set(s, s, s);
        tempObject.updateMatrix();
        needlesRef.current.setMatrixAt(i, tempObject.matrix);
        i++;
      }
      needlesRef.current.instanceMatrix.needsUpdate = true;
    }

    // Helper to update ornaments
    const updateOrnamentMesh = (ref: React.RefObject<THREE.InstancedMesh | null>, data: any[], speedMult: number, rotateOnDisperse = true) => {
        if (!ref.current) return;
        let i = 0;
        for (const d of data) {
          const x = d.initialPos.x + d.velocity.x * factor * speedMult;
          const y = d.initialPos.y + d.velocity.y * factor * speedMult;
          const z = d.initialPos.z + d.velocity.z * factor * speedMult;

          tempObject.position.set(x, y, z);
          
          if (rotateOnDisperse) {
            tempObject.rotation.set(
                factor * d.velocity.x, 
                factor * d.velocity.y, 
                factor * d.velocity.z
             );
          } else {
             tempObject.rotation.set(
                factor * d.velocity.x, 
                factor * d.velocity.y, 
                factor * d.velocity.z
             );
          }
          
          const s = d.scale * (1 - factor * 0.5);
          tempObject.scale.set(s, s, s);
          tempObject.updateMatrix();
          ref.current.setMatrixAt(i, tempObject.matrix);
          i++;
        }
        ref.current.instanceMatrix.needsUpdate = true;
    };

    updateOrnamentMesh(glossyRef, glossyData, 5);
    updateOrnamentMesh(matteRef, matteData, 5);
    updateOrnamentMesh(icicleRef, icicleData, 6); 

    // --- UPDATE HAT ---
    if (hatGroupRef.current) {
        // Base Position when assembled
        const baseX = 0;
        const baseY = TREE_HEIGHT - 7.2;
        const baseZ = 0;
        
        // Disperse logic
        const hX = baseX + hatDisperseData.velocity.x * factor;
        const hY = baseY + hatDisperseData.velocity.y * factor;
        const hZ = baseZ + hatDisperseData.velocity.z * factor;

        hatGroupRef.current.position.set(hX, hY, hZ);

        // Rotation logic
        // Start: [-0.1, 0, 0]
        // End: Spin around axis
        const startRot = new THREE.Euler(-0.1, 0, 0);
        hatGroupRef.current.rotation.set(
            startRot.x + factor * Math.PI,
            startRot.y + factor * Math.PI * 0.5,
            startRot.z + factor * Math.PI * 0.2
        );
        
        // Scale logic (optional, keep scale mostly consistent or shrink slightly)
        // const s = 3.8 * (1 - factor * 0.1); 
        // hatGroupRef.current.scale.set(s, s, s);
    }

  }, [needleData, glossyData, matteData, icicleData, hatDisperseData]);

  // --- INITIALIZATION ---
  useLayoutEffect(() => {
    // Force initial update
    updateMatrices(0);
    initialized.current = true;

    // Set initial colors
    const initColors = (ref: React.RefObject<THREE.InstancedMesh | null>, data: any[]) => {
        if (ref.current) {
            data.forEach((d, i) => {
                tempColor.set(d.color);
                ref.current!.setColorAt(i, tempColor);
            });
            ref.current.instanceColor!.needsUpdate = true;
        }
    };

    initColors(glossyRef, glossyData);
    initColors(matteRef, matteData);
    initColors(icicleRef, icicleData);

  }, [glossyData, matteData, icicleData, updateMatrices]);

  // --- LOOP ---
  useFrame((state, delta) => {
    // Safety check: if rendered but somehow matrices not set, force set them
    if (!initialized.current) {
         updateMatrices(0);
         initialized.current = true;
    }

    const target = mode === TreeMode.DISPERSED ? 1 : 0;
    const newFactor = THREE.MathUtils.lerp(currentFactor, target, delta * 2);
    
    // Slight optimization but allow small updates to ensure settling
    if (Math.abs(newFactor - currentFactor) < 0.00001 && Math.abs(newFactor - target) < 0.00001) {
        return;
    }
    
    setCurrentFactor(newFactor);
    updateMatrices(newFactor);
  });

  return (
    <group ref={groupRef}>
        {/* --- CENTRAL TRUNK --- */}
        <mesh position={[0, 1, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.4, 1.2, TREE_HEIGHT * 0.8, 16]} />
            <meshStandardMaterial color="#2d1b0e" roughness={0.9} />
        </mesh>

        {/* --- CROWN CORE --- */}
        <mesh position={[0, 1, 0]} castShadow receiveShadow>
            <coneGeometry args={[TREE_RADIUS * 0.6, TREE_HEIGHT, 32]} />
            <meshStandardMaterial color="#012204" roughness={0.9} />
        </mesh>

        {/* --- MAGA HAT TOPPER --- */}
        {/* Giant scale for high visibility, lowered significantly to sit on tree tip */}
        <group ref={hatGroupRef} position={[0, TREE_HEIGHT - 7.2, 0]} scale={3.8} rotation={[-0.1, 0, 0]}>
            
            {/* Cap Dome (Red Hemisphere) */}
            <mesh position={[0, 0.5, 0]}>
                <sphereGeometry args={[0.7, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <meshStandardMaterial color="#ff0000" roughness={0.4} metalness={0.1} />
            </mesh>
            
            {/* Cap Brim (Flattened Cylinder) */}
            <mesh position={[0, 0.5, 0.6]} rotation={[0.3, 0, 0]}>
                 <cylinderGeometry args={[0.72, 0.72, 0.05, 32, 1, false, -Math.PI / 2.5, Math.PI / 1.25]} />
                 <meshStandardMaterial color="#ff0000" roughness={0.4} metalness={0.1} />
            </mesh>

            {/* Cap Button */}
            <mesh position={[0, 1.2, 0]}>
                <sphereGeometry args={[0.08, 16, 16]} />
                <meshStandardMaterial color="#ff0000" />
            </mesh>

            {/* Slogan Text - Centered and Sized */}
            <Text
                position={[0, 0.70, 0.69]} // Lowered Y to sit better on forehead
                rotation={[-0.15, 0, 0]}   // Adjusted angle for lower position
                fontSize={0.3}
                color="white" 
                anchorX="center"
                anchorY="middle"
                maxWidth={2}
                textAlign="center"
                outlineWidth={0.02}
                outlineColor="#b45309" // Gold/Brown outline
                fontWeight="800"
            >
                MAGA
            </Text>

            {/* Made in China Label - Back */}
            <Text
                position={[0, 0.6, -0.70]}
                rotation={[-0.15, Math.PI, 0]}
                fontSize={0.08}
                color="black"
                anchorX="center"
                anchorY="middle"
            >
                Made in China
            </Text>

             {/* Topper Spot Light */}
            <pointLight distance={10} intensity={30} color="#ffaaaa" position={[0, 4, 4]} />
        </group>

        {/* --- NEEDLES --- */}
        <instancedMesh 
            ref={needlesRef} 
            args={[undefined, undefined, NEEDLE_COUNT]}
            castShadow
            receiveShadow
            frustumCulled={false}
        >
            <coneGeometry args={[0.2, 0.6, 5]} />
            <meshStandardMaterial 
                color={COLORS.EMERALD} 
                roughness={0.3}
                metalness={0.2}
            />
        </instancedMesh>

        {/* --- ORNAMENTS 1: GLOSSY SPHERES --- */}
        <instancedMesh 
            ref={glossyRef} 
            args={[undefined, undefined, counts.glossy]}
            castShadow
            receiveShadow
            frustumCulled={false}
        >
            <sphereGeometry args={[0.7, 32, 32]} />
            <meshStandardMaterial 
                roughness={0.05} 
                metalness={0.95}
                envMapIntensity={1.5}
            />
        </instancedMesh>

        {/* --- ORNAMENTS 2: MATTE SPHERES --- */}
        <instancedMesh 
            ref={matteRef} 
            args={[undefined, undefined, counts.matte]}
            castShadow
            receiveShadow
            frustumCulled={false}
        >
            <sphereGeometry args={[0.7, 32, 32]} />
            <meshStandardMaterial 
                roughness={0.7} 
                metalness={0.3}
                envMapIntensity={0.5}
            />
        </instancedMesh>

        {/* --- ORNAMENTS 3: ICICLES (CRYSTALS) --- */}
        <instancedMesh 
            ref={icicleRef} 
            args={[undefined, undefined, counts.icicle]}
            castShadow
            receiveShadow
            frustumCulled={false}
        >
            {/* Long thin cone for icicle shape */}
            <coneGeometry args={[0.25, 1.8, 8]} />
            <meshStandardMaterial 
                roughness={0.1} 
                metalness={0.9}
                emissive="#e0f2fe"
                emissiveIntensity={0.2}
                envMapIntensity={2.0}
            />
        </instancedMesh>
    </group>
  );
};