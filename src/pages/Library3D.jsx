import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Text, Html, Stats } from '@react-three/drei';
import * as THREE from 'three';

const safeNum = (val, fallback) => (Number.isFinite(val) ? val : fallback);

const BOOK_COLORS = ['#7f1d1d', '#1e3a8a', '#064e3b', '#78350f', '#4c1d95', '#134e4a', '#0f172a', '#831843'];
const SHARED_MATERIALS = BOOK_COLORS.map(color => new THREE.MeshLambertMaterial({ color }));
const PAGE_MATERIAL = new THREE.MeshLambertMaterial({ color: '#fdfbf7' });

function Book({ position, title, author, pages, index, thickness, height, status, activeState, setActiveBook, id }) {
  const groupRef = useRef();
  const pivotRef = useRef();
  const { camera } = useThree();
  
  const t = safeNum(thickness, 0.2);
  const h = safeNum(height, 1.4);
  const depth = 1.1;

  const spineGeo = useMemo(() => new THREE.BoxGeometry(t, h, 0.05), [t, h]);
  const coverGeo = useMemo(() => new THREE.BoxGeometry(0.02, h, depth), [h]);
  const pagesGeo = useMemo(() => new THREE.BoxGeometry(t - 0.04, h - 0.06, depth - 0.05), [t, h]);

  useFrame(() => {
    if (!groupRef.current || !pivotRef.current) return;

    let targetPos = new THREE.Vector3(...position);
    let targetRot = new THREE.Euler(0, 0, 0);
    let targetPivot = 0;

    const distanceToCameraX = Math.abs(camera.position.x - targetPos.x);
    
    if (activeState === 'shelf') {
      groupRef.current.visible = distanceToCameraX < 12;
      if (!groupRef.current.visible) return;
    } else {
      groupRef.current.visible = true;
      targetPos.set(camera.position.x, 0, camera.position.z - 4);
      targetRot.set(0, -Math.PI / 2, 0); 
      if (activeState === 'open') {
        targetPivot = -Math.PI * 0.8;
        targetPos.x += 0.6;
      }
    }

    groupRef.current.position.lerp(targetPos, 0.15);
    groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRot.y, 0.15);
    pivotRef.current.rotation.y = THREE.MathUtils.lerp(pivotRef.current.rotation.y, targetPivot, 0.15);
  });

  return (
    <group ref={groupRef} position={position} onClick={(e) => {
      e.stopPropagation();
      setActiveBook({ id, state: activeState === 'inspecting' ? 'open' : 'inspecting' });
    }}>
      {/* Spine */}
      <mesh position={[0, 0, depth/2]} geometry={spineGeo} material={SHARED_MATERIALS[index % 8]}>
         <Text position={[0, 0, 0.03]} rotation={[0, 0, Math.PI / 2]} fontSize={0.06} maxWidth={h * 0.8} color="white" anchorX="center" anchorY="middle">
            {title?.substring(0, 25).toUpperCase()}
          </Text>
      </mesh>

      {/* Back Cover */}
      <mesh position={[-t/2, 0, 0]} geometry={coverGeo} material={SHARED_MATERIALS[index % 8]} />
      
      {/* Pages & Metadata */}
      <mesh position={[0, 0, 0]} geometry={pagesGeo} material={PAGE_MATERIAL}>
        {activeState === 'open' && (
          <Html position={[t/2 + 0.02, 0, 0]} rotation={[0, Math.PI / 2, 0]} transform distanceFactor={1.5}>
            <div style={{
              width: '240px',
              background: '#fdfbf7',
              color: '#1a1a1a',
              padding: '25px',
              border: '1px solid #d1d1d1',
              boxShadow: '10px 0 20px rgba(0,0,0,0.1)',
              fontFamily: 'serif',
              pointerEvents: 'none'
            }}>
              <h2 style={{ margin: '0 0 8px 0', fontSize: '18px', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>{title}</h2>
              <p style={{ fontStyle: 'italic', color: '#444', fontSize: '14px', margin: 0 }}>{author}</p>
              <div style={{ marginTop: '15px', fontSize: '12px', lineHeight: '1.4', color: '#666' }}>
                <p style={{ margin: '2px 0' }}>Status: <strong>{status}</strong></p>
                <p style={{ margin: '2px 0' }}>Length: {pages} pages</p>
              </div>
            </div>
          </Html>
        )}
      </mesh>

      {/* Front Cover Pivot */}
      <group ref={pivotRef} position={[t/2, 0, depth/2]}>
        <mesh position={[0, 0, -depth/2]} geometry={coverGeo} material={SHARED_MATERIALS[index % 8]}>
          {/* TITLE FIX: Position Z is 0 (centered on the cover), textAlign centers multi-line text */}
          {activeState !== 'shelf' && (
            <Text 
              position={[0.015, 0, 0]} 
              rotation={[0, Math.PI / 2, 0]} 
              fontSize={0.08} 
              maxWidth={depth * 0.85} 
              textAlign="center"
              color="white" 
              anchorX="center" 
              anchorY="middle"
            >
              {title}
            </Text>
          )}
        </mesh>
      </group>
    </group>
  );
}

// Separate component to handle the 1D Rail logic
function CameraRig() {
  const { camera } = useThree();
  const controlsRef = useRef();

  useFrame(() => {
    // 1D LOCK: Force the camera to stay at Y=0 and Z=12 regardless of panning
    camera.position.y = 0;
    camera.position.z = 12;
    if (controlsRef.current) {
      controlsRef.current.target.y = 0;
      controlsRef.current.target.z = 0;
    }
  });

  return (
    <OrbitControls 
      ref={controlsRef}
      enableRotate={false} 
      enableZoom={false} 
      enablePan={true} 
      mouseButtons={{ LEFT: THREE.MOUSE.PAN }} 
      panSpeed={2}
      minPan={new THREE.Vector3(-25, 0, 0)}
      maxPan={new THREE.Vector3(25, 0, 0)}
    />
  );
}

function Bookshelf({ x }) {
  return (
    <group position={[x, -2.5, 0]}>
      <mesh position={[-2.55, 2.5, 0]}><boxGeometry args={[0.1, 6, 1.2]} /><meshLambertMaterial color="#221108" /></mesh>
      <mesh position={[2.55, 2.5, 0]}><boxGeometry args={[0.1, 6, 1.2]} /><meshLambertMaterial color="#221108" /></mesh>
      {[0, 2, 4, 6].map(y => (
        <mesh key={y} position={[0, y, 0]}><boxGeometry args={[5.2, 0.08, 1.2]} /><meshLambertMaterial color="#2d1a0e" /></mesh>
      ))}
      <mesh position={[0, 3, -0.6]}><boxGeometry args={[5.2, 6, 0.05]} /><meshLambertMaterial color="#140a05" /></mesh>
    </group>
  );
}

export default function Library3D() {
  const [books, setBooks] = useState([]);
  const [activeBook, setActiveBook] = useState(null);

  useEffect(() => {
    fetch("/api/books")
      .then(res => res.json())
      .then(data => setBooks(data.map(b => ({
        ...b,
        page_count: safeNum(b.page_count, 300),
        id: b.id || Math.random()
      }))))
      .catch(() => {});
  }, []);

  const shelfBooks = useMemo(() => {
    return books.map((b, i) => {
      const caseIdx = Math.floor(i / 36); 
      const shelfIdx = Math.floor((i % 36) / 12);
      const colIdx = i % 12;
      const thickness = Math.max(0.15, Math.min(0.35, b.page_count / 1500));
      return {
        ...b,
        position: [ (caseIdx * 6) + (colIdx * 0.42) - 2.3, (shelfIdx * 2) - 1.7, 0],
        thickness: thickness,
        height: 1.4 + (i % 5) * 0.05 
      };
    });
  }, [books]);

  return (
    <div className="w-full h-screen bg-black">
      <Canvas dpr={[1, 1.5]} onPointerMissed={() => setActiveBook(null)}>
        <Stats />
        <PerspectiveCamera makeDefault position={[0, 0, 12]} fov={40} />
        
        <CameraRig />

        <hemisphereLight intensity={0.7} groundColor="#000000" />
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={0.8} />
        
        {[-12, -6, 0, 6, 12].map(x => <Bookshelf key={x} x={x} />)}

        {shelfBooks.map((book, i) => (
          <Book 
            key={book.id} 
            {...book} 
            index={i} 
            activeState={activeBook?.id === book.id ? activeBook.state : 'shelf'}
            setActiveBook={setActiveBook}
          />
        ))}
      </Canvas>
    </div>
  );
}