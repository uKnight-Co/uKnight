"use client"

import { useEffect, useRef } from "react"

interface Particle {
    x: number
    y: number
    vx: number
    vy: number
    radius: number
    opacity: number
}

const CONNECTION_DISTANCE = 180
const MOUSE_REPEL_DISTANCE = 120
const PARTICLE_COUNT_BASE = 50

export function NetworkBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const mouseRef = useRef({ x: -9999, y: -9999 })
    const particlesRef = useRef<Particle[]>([])
    const rafRef = useRef<number>(0)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        const resize = () => {
            canvas.width = canvas.offsetWidth
            canvas.height = canvas.offsetHeight
            initParticles()
        }

        const initParticles = () => {
            const count = Math.min(
                PARTICLE_COUNT_BASE + Math.floor((canvas.width * canvas.height) / 18000),
                100
            )
            particlesRef.current = Array.from({ length: count }, () => ({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.4,
                vy: (Math.random() - 0.5) * 0.4,
                radius: 1.5 + Math.random() * 2,
                opacity: 0.3 + Math.random() * 0.4,
            }))
        }

        const onMouseMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect()
            mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
        }

        const onMouseLeave = () => {
            mouseRef.current = { x: -9999, y: -9999 }
        }

        canvas.addEventListener("mousemove", onMouseMove)
        canvas.addEventListener("mouseleave", onMouseLeave)
        window.addEventListener("resize", resize)

        resize()

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            const particles = particlesRef.current
            const mouse = mouseRef.current

            // Update positions
            for (const p of particles) {
                // Mouse repulsion
                const dx = p.x - mouse.x
                const dy = p.y - mouse.y
                const dist = Math.sqrt(dx * dx + dy * dy)
                if (dist < MOUSE_REPEL_DISTANCE && dist > 0) {
                    const force = (MOUSE_REPEL_DISTANCE - dist) / MOUSE_REPEL_DISTANCE
                    p.vx += (dx / dist) * force * 0.3
                    p.vy += (dy / dist) * force * 0.3
                }

                // Speed limit
                const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy)
                if (speed > 1.5) {
                    p.vx = (p.vx / speed) * 1.5
                    p.vy = (p.vy / speed) * 1.5
                }

                // Damping
                p.vx *= 0.99
                p.vy *= 0.99

                p.x += p.vx
                p.y += p.vy

                // Bounce
                if (p.x < 0) { p.x = 0; p.vx *= -1 }
                if (p.x > canvas.width) { p.x = canvas.width; p.vx *= -1 }
                if (p.y < 0) { p.y = 0; p.vy *= -1 }
                if (p.y > canvas.height) { p.y = canvas.height; p.vy *= -1 }
            }

            // Draw connections
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x
                    const dy = particles[i].y - particles[j].y
                    const dist = Math.sqrt(dx * dx + dy * dy)
                    if (dist < CONNECTION_DISTANCE) {
                        const alpha = (1 - dist / CONNECTION_DISTANCE) * 0.25
                        ctx.beginPath()
                        ctx.strokeStyle = `rgba(251, 191, 36, ${alpha})`
                        ctx.lineWidth = 0.8
                        ctx.moveTo(particles[i].x, particles[i].y)
                        ctx.lineTo(particles[j].x, particles[j].y)
                        ctx.stroke()
                    }
                }
            }

            // Draw mouse connections (stronger glow near cursor)
            for (const p of particles) {
                const dx = p.x - mouse.x
                const dy = p.y - mouse.y
                const dist = Math.sqrt(dx * dx + dy * dy)
                if (dist < CONNECTION_DISTANCE * 1.5) {
                    const alpha = (1 - dist / (CONNECTION_DISTANCE * 1.5)) * 0.6
                    ctx.beginPath()
                    ctx.strokeStyle = `rgba(251, 191, 36, ${alpha})`
                    ctx.lineWidth = 1
                    ctx.moveTo(p.x, p.y)
                    ctx.lineTo(mouse.x, mouse.y)
                    ctx.stroke()
                }
            }

            // Draw nodes
            for (const p of particles) {
                ctx.beginPath()
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
                ctx.fillStyle = `rgba(251, 191, 36, ${p.opacity})`
                ctx.fill()
            }

            rafRef.current = requestAnimationFrame(draw)
        }

        draw()

        return () => {
            cancelAnimationFrame(rafRef.current)
            canvas.removeEventListener("mousemove", onMouseMove)
            canvas.removeEventListener("mouseleave", onMouseLeave)
            window.removeEventListener("resize", resize)
        }
    }, [])

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-auto"
            style={{ display: "block" }}
        />
    )
}
