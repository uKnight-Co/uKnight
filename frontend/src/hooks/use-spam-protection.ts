import { useState, useRef, useCallback } from 'react';

interface SpamProtectionOptions {
    maxAttempts: number;      // e.g. 10
    timeWindow: number;       // e.g. 5000ms (5s)
    cooldownDuration: number; // e.g. 5s
}

export function useSpamProtection({ maxAttempts, timeWindow, cooldownDuration }: SpamProtectionOptions) {
    const [isCooldown, setIsCooldown] = useState(false);
    const [cooldownTime, setCooldownTime] = useState(0);
    const attemptsRef = useRef<number[]>([]);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const attemptAction = useCallback(() => {
        if (isCooldown) return false;

        const now = Date.now();
        // Filter out timestamps older than the time window
        attemptsRef.current = attemptsRef.current.filter(timestamp => now - timestamp < timeWindow);

        // Add current attempt
        attemptsRef.current.push(now);

        // Check if attempts exceed limit within window
        if (attemptsRef.current.length > maxAttempts) {
            setIsCooldown(true);
            setCooldownTime(cooldownDuration);
            attemptsRef.current = []; // Reset attempts after cooldown trigger

            if (intervalRef.current) clearInterval(intervalRef.current);

            intervalRef.current = setInterval(() => {
                setCooldownTime((prev) => {
                    if (prev <= 1) {
                        if (intervalRef.current) clearInterval(intervalRef.current);
                        setIsCooldown(false);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            return false; // Action blocked due to spam
        }

        return true; // Action allowed
    }, [isCooldown, maxAttempts, timeWindow, cooldownDuration]);

    return {
        isCooldown,
        cooldownTime,
        attemptAction
    };
}
