import { useEffect, useState } from 'react';

export interface CountdownTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function useCountdown(endsAt: string) {
  const calculateTimeLeft = (): CountdownTime => {
    const difference = +new Date(endsAt) - +new Date();
    
    if (difference <= 0) {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
      };
    }

    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
    };
  };

  const [timeLeft, setTimeLeft] = useState<CountdownTime>(calculateTimeLeft());

  useEffect(() => {
    // Run once immediately on mount or endsAt change
    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [endsAt]);

  const pad = (n: number) => String(n).padStart(2, '0');

  // Format total hours (including days) as HH:MM:SS
  const totalHours = timeLeft.days * 24 + timeLeft.hours;
  const formattedString = `${pad(totalHours)}:${pad(timeLeft.minutes)}:${pad(timeLeft.seconds)}`;

  return {
    formatted: formattedString,
    days: timeLeft.days,
    hours: timeLeft.hours,
    minutes: timeLeft.minutes,
    seconds: timeLeft.seconds,
  };
}
