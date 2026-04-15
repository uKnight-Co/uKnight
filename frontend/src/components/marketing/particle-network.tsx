"use client"

import { useEffect, useRef } from "react"
import { useTheme } from "next-themes"

export function ParticleNetwork() {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const { theme } = useTheme()

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        let width = canvas.width = window.innerWidth
        let height = canvas.height = window.innerHeight

        const particles: { x: number; y: number; vx: number; vy: number; radius: number }[] = []
        const numParticles = 80
        const maxDistance = 150
        
        const mouse = { x: -1000, y: -1000 }

        for (let i = 0; i < numParticles; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 1.5,
                vy: (Math.random() - 0.5) * 1.5,
                radius: Math.random() * 2 + 1
            })
        }

        const handleResize = () => {
            width = canvas.width = window.innerWidth
            height = canvas.height = window.innerHeight
        }

        const handleMouseMove = (e: MouseEvent) => {
            mouse.x = e.clientX
            mouse.y = e.clientY + window.scrollY
        }
        
        const handleMouseLeave = () => {
            mouse.x = -1000;
            mouse.y = -1000;
        }

        window.addEventListener("resize", handleResize)
        document.addEventListener("mousemove", handleMouseMove)
        document.addEventListener("mouseleave", handleMouseLeave)

        let animationId: number
        const animate = () => {
            ctx.clearRect(0, 0, width, height)
            
            // Subtle gold
            ctx.fillStyle = theme === "dark" ? "rgba(251, 191, 36, 0.4)" : "rgba(245, 158, 11, 0.4)"
            
            particles.forEach((p, index) => {
                p.x += p.vx
                p.y += p.vy

                if (p.x < 0 || p.x > width) p.vx *= -1
                if (p.y < 0 || p.y > height) p.vy *= -1

                // Mouse interaction - pull particles slightly towards mouse if close
                const dxMouse = mouse.x - p.x
                const dyMouse = mouse.y - p.y
                const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse)
                if (distMouse < 200) {
                    p.x -= dxMouse * 0.05
                    p.y -= dyMouse * 0.05
                }

                ctx.beginPath()
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
                ctx.fill()

                for (let j = index + 1; j < numParticles; j++) {
                    const p2 = particles[j]
                    const dx = p.x - p2.x
                    const dy = p.y - p2.y
                    const dist = Math.sqrt(dx * dx + dy * dy)

                    if (dist < maxDistance) {
                        ctx.beginPath()
                        ctx.strokeStyle = theme === "dark" 
                            ? `rgba(251, 191, 36, ${0.15 * (1 - dist / maxDistance)})`
                            : `rgba(245, 158, 11, ${0.2 * (1 - dist / maxDistance)})`
                        ctx.lineWidth = 1
                        ctx.moveTo(p.x, p.y)
                        ctx.lineTo(p2.x, p2.y)
                        ctx.stroke()
                    }
                }
                
                // Draw lines to mouse
                if (distMouse < maxDistance * 1.5) {
                    ctx.beginPath()
                    ctx.strokeStyle = theme === "dark" 
                        ? `rgba(251, 191, 36, ${0.3 * (1 - distMouse / (maxDistance * 1.5))})`
                        : `rgba(245, 158, 11, ${0.4 * (1 - distMouse / (maxDistance * 1.5))})`
                    ctx.lineWidth = 1.5
                    ctx.moveTo(p.x, p.y)
                    ctx.lineTo(mouse.x, mouse.y)
                    ctx.stroke()
                }
            })

            animationId = requestAnimationFrame(animate)
        }
        animate()

        return () => {
            window.removeEventListener("resize", handleResize)
            document.removeEventListener("mousemove", handleMouseMove)
            document.removeEventListener("mouseleave", handleMouseLeave)
            cancelAnimationFrame(animationId)
        }
    }, [theme])

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none z-0"
            style={{ width: "100%", height: "100%", opacity: 0.8 }}
        />
    )
}
