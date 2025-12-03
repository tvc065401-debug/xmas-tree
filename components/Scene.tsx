import React, { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Sparkles, Environment } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { Tree } from './Tree';
import { TreeMode } from '../types';
import { COLORS } from '../constants';

const Snow: React.FC = () => {
  const count = 1500;
  
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for(let i=0; i<count; i++) {
        pos[i*3] = (Math.random() - 0.5) * 50; // x
        pos[i*3+1] = Math.random() * 40 - 10; // y
        pos[i*3+2] = (Math.random() - 0.5) * 50; // z
    }
    return pos;
  }, []);
  
  const speeds = useMemo(() => {
      const s = new Float32Array(count);
      for(let i=0; i<count; i++) s[i] = 0.5 + Math.random() * 1.5;
      return s;
  }, []);

  const ref = useRef<any>(null);

  useFrame((_state, delta) => {
    if (!ref.current) return;
    const pos = ref.current.geometry.attributes.position.array;
    
    for (let i = 0; i < count; i++) {
        // y index is i*3 + 1
        pos[i*3 + 1] -= speeds[i] * delta * 2; // Falling speed
        
        // Reset if too low
        if (pos[i*3 + 1] < -10) {
            pos[i*3 + 1] = 30; 
        }
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
        <bufferGeometry>
            <bufferAttribute 
                attach="attributes-position" 
                count={count} 
                array={positions} 
                itemSize={3} 
            />
        </bufferGeometry>
        <pointsMaterial 
            size={0.15} 
            color="#ffffff" 
            transparent 
            opacity={0.4} 
            depthWrite={false} 
        />
    </points>
  )
}

interface SceneProps {
  mode: TreeMode;
}

export const Scene: React.FC<SceneProps> = ({ mode }) => {
  return (
    <div className="w-full h-full absolute inset-0">
      <Canvas
        camera={{ position: [0, 4, 18], fov: 45, near: 0.1, far: 1000 }}
        gl={{ 
            antialias: true, 
            toneMappingExposure: 1.1,
        }}
        dpr={[1, 2]} 
        shadows
      >
        <color attach="background" args={['#020202']} />
        
        {/* --- LIGHTING --- */}
        <ambientLight intensity={1.5} color="#ffffff" />
        
        <hemisphereLight args={['#fff0f0', '#050505', 2]} />
        
        {/* Main Golden Spotlight */}
        <spotLight 
          position={[10, 20, 10]} 
          angle={0.4} 
          penumbra={1} 
          intensity={800} 
          distance={200}
          color={COLORS.WARM_LIGHT} 
          castShadow 
          shadow-bias={-0.0001}
        />
        
        {/* Fill Light */}
        <pointLight position={[-10, 5, -10]} intensity={200} color="#bfdbfe" distance={50} />

        {/* --- ENVIRONMENT --- */}
        <Environment preset="city" blur={0.8} background={false} />

        {/* --- CONTENT --- */}
        <Suspense fallback={<mesh><boxGeometry args={[1,1,1]} /><meshStandardMaterial color="gold" /></mesh>}>
          <group position={[0, -2, 0]}>
            <Tree mode={mode} />
            
            {/* --- LUXURY BASE PEDESTAL --- */}
            <group position={[0, -5, 0]}>
                {/* 1. Black Marble Plinth (Octagonal) */}
                <mesh position={[0, 0.25, 0]} receiveShadow castShadow>
                    <cylinderGeometry args={[4.5, 4.8, 0.5, 8]} />
                    <meshStandardMaterial color="#0a0a0a" roughness={0.1} metalness={0.8} />
                </mesh>
                
                {/* 2. Gold Base Ring */}
                <mesh position={[0, 0.6, 0]} receiveShadow castShadow>
                    <cylinderGeometry args={[3.5, 3.8, 0.4, 64]} />
                    <meshStandardMaterial color={COLORS.GOLD} roughness={0.1} metalness={1} envMapIntensity={1.5} />
                </mesh>

                {/* 3. Ornate Urn Body (Dark Mahogany/Red) */}
                <mesh position={[0, 1.5, 0]} receiveShadow castShadow>
                     <cylinderGeometry args={[2.0, 3.0, 2.0, 64]} />
                     <meshStandardMaterial color="#3f0000" roughness={0.2} metalness={0.4} />
                </mesh>

                {/* 4. Upper Gold Rim */}
                <mesh position={[0, 2.5, 0]} receiveShadow castShadow>
                    <cylinderGeometry args={[2.2, 2.2, 0.15, 64]} />
                    <meshStandardMaterial color={COLORS.GOLD} roughness={0.1} metalness={1} envMapIntensity={1.5} />
                </mesh>
            </group>
            
            {/* Floor Reflection */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -5, 0]} receiveShadow>
              <planeGeometry args={[200, 200]} />
              <meshStandardMaterial 
                color="#050505" 
                roughness={0.1} 
                metalness={0.8} 
              />
            </mesh>
          </group>
        </Suspense>

        {/* --- PARTICLES --- */}
        <Stars radius={60} depth={50} count={3000} factor={4} saturation={0} fade speed={0.5} />
        <Snow />
        <Sparkles 
            count={400} 
            scale={12} 
            size={4} 
            speed={0.3} 
            opacity={0.8} 
            color={COLORS.GOLD} 
            position={[0, 2, 0]}
        />

        {/* --- POST PROCESSING --- */}
        <EffectComposer disableNormalPass>
          <Bloom 
            luminanceThreshold={1} 
            mipmapBlur 
            intensity={1.2} 
            radius={0.5} 
          />
          <Vignette eskil={false} offset={0.1} darkness={0.8} />
        </EffectComposer>

        {/* --- CONTROLS --- */}
        <OrbitControls 
          enablePan={false} 
          minPolarAngle={Math.PI / 4} 
          maxPolarAngle={Math.PI / 1.9}
          minDistance={10}
          maxDistance={40}
          autoRotate={mode === TreeMode.ASSEMBLED}
          autoRotateSpeed={0.5}
          target={[0, 2, 0]}
        />
      </Canvas>
    </div>
  );
};