import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

/**
 * Custom hook for smooth step transitions using GSAP
 * @param currentStep - Current step number
 * @param containerRef - Ref to the container element
 */
export function useStepTransition(currentStep: number, containerRef: React.RefObject<HTMLDivElement>) {
  const prevStepRef = useRef<number>(currentStep);
  const stepContentRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (!containerRef.current) return;

    const prevStep = prevStepRef.current;
    const isForward = currentStep > prevStep;

    // Get previous and current step elements
    const prevElement = stepContentRefs.current.get(prevStep);
    const currentElement = stepContentRefs.current.get(currentStep);

    if (prevElement && currentElement) {
      // Create timeline for smooth transition
      const tl = gsap.timeline();

      // Exit animation for previous step
      tl.to(prevElement, {
        opacity: 0,
        x: isForward ? -30 : 30,
        scale: 0.95,
        duration: 0.2,
        ease: 'power2.in',
        onComplete: () => {
          prevElement.style.display = 'none';
        },
      });

      // Enter animation for current step
      currentElement.style.display = 'block';
      gsap.set(currentElement, {
        opacity: 0,
        x: isForward ? 30 : -30,
        scale: 0.95,
      });

      tl.to(
        currentElement,
        {
          opacity: 1,
          x: 0,
          scale: 1,
          duration: 0.3,
          ease: 'power2.out',
        },
        '-=0.1' // Start slightly before previous animation ends
      );
    } else if (currentElement) {
      // First render - just fade in
      currentElement.style.display = 'block';
      gsap.fromTo(
        currentElement,
        {
          opacity: 0,
          x: 20,
          scale: 0.98,
        },
        {
          opacity: 1,
          x: 0,
          scale: 1,
          duration: 0.3,
          ease: 'power2.out',
        }
      );
    }

    prevStepRef.current = currentStep;
  }, [currentStep, containerRef]);

  const registerStepContent = (step: number, element: HTMLDivElement | null) => {
    if (element) {
      stepContentRefs.current.set(step, element);
      // Initially hide all steps except current
      if (step !== currentStep) {
        element.style.display = 'none';
      }
    } else {
      stepContentRefs.current.delete(step);
    }
  };

  return { registerStepContent };
}

