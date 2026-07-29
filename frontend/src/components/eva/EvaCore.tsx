import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Points, PointMaterial } from '@react-three/drei'
import * as THREE from 'three'
import { motion } from 'framer-motion'
import type { SessionStatus } from '@/types'

// ─── Particle Field ────────────────────────────────────────────────────────────

function ParticleField({ count = 800, status }: { count?: number; status: SessionStatus }) {
  const ref = useRef<THREE.Points>(null!)

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const r = 2.5 + Math.random() * 2.5
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      pos[i * 3 + 2] = r * Math.cos(phi)
    }
    return pos
  }, [count])

  const speeds = useMemo(() => new Float32Array(count).map(() => 0.001 + Math.random() * 0.003), [count])

  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.elapsedTime
    const speedMult = status === 'listening' ? 2.5 : status === 'speaking' ? 3.5 : status === 'thinking' ? 1.8 : 1

    ref.current.rotation.y = t * 0.04 * speedMult
    ref.current.rotation.x = Math.sin(t * 0.02) * 0.15

    const pos = ref.current.geometry.attributes.position.array as Float32Array
    for (let i = 0; i < count; i++) {
      const idx = i * 3
      const speed = speeds[i] * speedMult
      const x = positions[idx]
      const y = positions[idx + 1]
      const angle = Math.atan2(y, x) + speed
      const r = Math.sqrt(x * x + y * y)
      pos[idx] = r * Math.cos(angle)
      pos[idx + 1] = r * Math.sin(angle)
    }
    ref.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#6366f1"
        size={0.025}
        sizeAttenuation
        depthWrite={false}
        opacity={status === 'idle' ? 0.4 : 0.7}
      />
    </Points>
  )
}

// ─── Energy Ring ──────────────────────────────────────────────────────────────

function EnergyRing({
  radius,
  color,
  speed,
  opacity,
  status,
}: {
  radius: number
  color: string
  speed: number
  opacity: number
  status: SessionStatus
}) {
  const groupRef = useRef<THREE.Group>(null!)

  useFrame((state) => {
    if (!groupRef.current) return
    const t = state.clock.elapsedTime
    const mult = status === 'speaking' ? 2 : status === 'listening' ? 1.5 : status === 'thinking' ? 1.2 : 1
    groupRef.current.rotation.z = t * speed * mult
    groupRef.current.rotation.x = Math.sin(t * 0.3) * 0.4

    const scale = 1 + Math.sin(t * 2 * mult) * 0.05
    groupRef.current.scale.set(scale, scale, 1)
  })

  const points = useMemo(() => {
    const pts = []
    for (let i = 0; i <= 128; i++) {
      const angle = (i / 128) * Math.PI * 2
      pts.push(new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0))
    }
    return pts
  }, [radius])

  return (
    <group ref={groupRef}>
      <primitive object={new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({ color, transparent: true, opacity })
      )} />
    </group>
  )
}

// ─── Core Sphere ──────────────────────────────────────────────────────────────

function CoreSphere({ status, audioLevel }: { status: SessionStatus; audioLevel: number }) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const glowRef = useRef<THREE.Mesh>(null!)

  const coreColor = useMemo(() => {
    switch (status) {
      case 'listening': return '#22d3ee'
      case 'speaking': return '#a855f7'
      case 'thinking': return '#f59e0b'
      default: return '#6366f1'
    }
  }, [status])

  useFrame((state) => {
    if (!meshRef.current || !glowRef.current) return
    const t = state.clock.elapsedTime
    const pulse = status === 'listening'
      ? 1 + audioLevel * 0.4 + Math.sin(t * 8) * 0.05
      : status === 'speaking'
      ? 1 + Math.sin(t * 6) * 0.12 + audioLevel * 0.2
      : status === 'thinking'
      ? 1 + Math.sin(t * 3) * 0.08
      : 1 + Math.sin(t * 1.5) * 0.03

    meshRef.current.scale.setScalar(pulse)
    glowRef.current.scale.setScalar(pulse * 1.4)

    // Update core color
    const mat = meshRef.current.material as THREE.MeshStandardMaterial
    mat.emissiveIntensity = 0.5 + audioLevel * 1.5 + Math.sin(t * 2) * 0.2
  })

  return (
    <group>
      {/* Outer glow */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.65, 32, 32]} />
        <meshStandardMaterial
          color={coreColor}
          transparent
          opacity={0.08}
          roughness={0}
          metalness={0}
        />
      </mesh>
      {/* Inner core */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.45, 64, 64]} />
        <meshStandardMaterial
          color={coreColor}
          emissive={coreColor}
          emissiveIntensity={0.6}
          roughness={0.1}
          metalness={0.4}
          transparent
          opacity={0.95}
        />
      </mesh>
      {/* Inner shimmer */}
      <mesh>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffffff"
          emissiveIntensity={0.3}
          transparent
          opacity={0.12}
          roughness={0}
        />
      </mesh>
    </group>
  )
}

// ─── Scene ────────────────────────────────────────────────────────────────────

function Scene({ status, audioLevel }: { status: SessionStatus; audioLevel: number }) {
  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[0, 0, 3]} intensity={1} color="#6366f1" />
      <pointLight position={[3, 2, 0]} intensity={0.5} color="#22d3ee" />
      <pointLight position={[-3, -2, 0]} intensity={0.5} color="#a855f7" />

      <CoreSphere status={status} audioLevel={audioLevel} />

      <EnergyRing radius={0.85} color="#6366f1" speed={0.3} opacity={0.6} status={status} />
      <EnergyRing radius={1.1} color="#22d3ee" speed={-0.2} opacity={0.4} status={status} />
      <EnergyRing radius={1.4} color="#a855f7" speed={0.15} opacity={0.25} status={status} />
      <EnergyRing radius={1.75} color="#6366f1" speed={-0.1} opacity={0.15} status={status} />

      <ParticleField count={600} status={status} />
    </>
  )
}

// ─── Status Labels ────────────────────────────────────────────────────────────

const statusConfig: Record<SessionStatus, { label: string; color: string; pulse: boolean }> = {
  idle: { label: 'Ready', color: 'text-eva-accent-bright', pulse: false },
  listening: { label: 'Listening...', color: 'text-eva-cyan', pulse: true },
  thinking: { label: 'Thinking...', color: 'text-eva-amber', pulse: true },
  speaking: { label: 'Speaking', color: 'text-eva-purple', pulse: true },
  paused: { label: 'Paused', color: 'text-eva-text-muted', pulse: false },
}

// ─── Main Export ──────────────────────────────────────────────────────────────

interface EvaCoreProps {
  status: SessionStatus
  audioLevel?: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

export function EvaCore({ status, audioLevel = 0, size = 'md', showLabel = true }: EvaCoreProps) {
  const cfg = statusConfig[status]

  const dimensions = {
    sm: { canvas: 160, container: 160 },
    md: { canvas: 260, container: 260 },
    lg: { canvas: 360, container: 360 },
  }

  const d = dimensions[size]

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        style={{ width: d.container, height: d.container }}
        className="relative"
      >
        {/* Glow backdrop */}
        <div
          className="absolute inset-0 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{
            background: status === 'listening'
              ? 'radial-gradient(circle, #22d3ee, transparent)'
              : status === 'speaking'
              ? 'radial-gradient(circle, #a855f7, transparent)'
              : status === 'thinking'
              ? 'radial-gradient(circle, #f59e0b, transparent)'
              : 'radial-gradient(circle, #6366f1, transparent)',
          }}
        />
        <Canvas
          camera={{ position: [0, 0, 4], fov: 45 }}
          style={{ width: d.canvas, height: d.canvas, background: 'transparent' }}
          gl={{ antialias: true, alpha: true }}
          dpr={[1, 2]}
        >
          <Scene status={status} audioLevel={audioLevel} />
        </Canvas>
      </div>

      {showLabel && (
        <motion.div
          key={status}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2"
        >
          {cfg.pulse && (
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                status === 'listening' ? 'bg-eva-cyan' : status === 'speaking' ? 'bg-eva-purple' : 'bg-eva-amber'
              }`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                status === 'listening' ? 'bg-eva-cyan' : status === 'speaking' ? 'bg-eva-purple' : 'bg-eva-amber'
              }`} />
            </span>
          )}
          <span className={`text-sm font-medium ${cfg.color}`}>{cfg.label}</span>
        </motion.div>
      )}
    </div>
  )
}
