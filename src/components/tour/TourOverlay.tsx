import React, { useEffect, useState, useRef } from 'react';
import { useTour } from './TourProvider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HighlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function TourOverlay() {
  const { isActive, currentStep, steps, nextStep, prevStep, endTour, goToStep } = useTour();
  const [highlightRect, setHighlightRect] = useState<HighlightRect | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [isAnimating, setIsAnimating] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const currentTourStep = steps[currentStep];

  useEffect(() => {
    if (!isActive || !currentTourStep) {
      setHighlightRect(null);
      return;
    }

    setIsAnimating(true);

    // Find the target element
    const targetElement = document.querySelector(currentTourStep.target);
    
    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      const padding = 8;

      setHighlightRect({
        top: rect.top - padding + window.scrollY,
        left: rect.left - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
      });

      // Scroll element into view
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Calculate tooltip position
      const position = currentTourStep.position || 'bottom';
      let tooltipTop = 0;
      let tooltipLeft = 0;

      setTimeout(() => {
        if (tooltipRef.current) {
          const tooltipRect = tooltipRef.current.getBoundingClientRect();
          
          switch (position) {
            case 'top':
              tooltipTop = rect.top - tooltipRect.height - 20 + window.scrollY;
              tooltipLeft = rect.left + rect.width / 2 - tooltipRect.width / 2;
              break;
            case 'bottom':
              tooltipTop = rect.bottom + 20 + window.scrollY;
              tooltipLeft = rect.left + rect.width / 2 - tooltipRect.width / 2;
              break;
            case 'left':
              tooltipTop = rect.top + rect.height / 2 - tooltipRect.height / 2 + window.scrollY;
              tooltipLeft = rect.left - tooltipRect.width - 20;
              break;
            case 'right':
              tooltipTop = rect.top + rect.height / 2 - tooltipRect.height / 2 + window.scrollY;
              tooltipLeft = rect.right + 20;
              break;
          }

          // Keep tooltip within viewport
          tooltipLeft = Math.max(20, Math.min(tooltipLeft, window.innerWidth - tooltipRect.width - 20));
          tooltipTop = Math.max(20, tooltipTop);

          setTooltipPosition({ top: tooltipTop, left: tooltipLeft });
        }
      }, 100);
    }

    const timer = setTimeout(() => setIsAnimating(false), 400);
    return () => clearTimeout(timer);
  }, [isActive, currentStep, currentTourStep]);

  if (!isActive || !currentTourStep) return null;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* Dark overlay with cutout */}
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          <mask id="tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {highlightRect && (
              <rect
                x={highlightRect.left}
                y={highlightRect.top}
                width={highlightRect.width}
                height={highlightRect.height}
                rx="8"
                fill="black"
                className={cn(
                  "transition-all duration-500 ease-out",
                  isAnimating && "animate-pulse"
                )}
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.75)"
          mask="url(#tour-mask)"
        />
      </svg>

      {/* Highlight border with zoom effect */}
      {highlightRect && (
        <div
          className={cn(
            "absolute border-2 border-primary rounded-lg pointer-events-none transition-all duration-500 ease-out",
            isAnimating && "animate-[scale-in_0.4s_ease-out]"
          )}
          style={{
            top: highlightRect.top,
            left: highlightRect.left,
            width: highlightRect.width,
            height: highlightRect.height,
            boxShadow: '0 0 0 4px rgba(var(--primary), 0.3), 0 0 30px rgba(var(--primary), 0.4)',
          }}
        >
          {/* Pulsing ring effect */}
          <div className="absolute inset-0 rounded-lg border-2 border-primary/50 animate-ping" />
        </div>
      )}

      {/* Tooltip Card */}
      <div
        ref={tooltipRef}
        className={cn(
          "absolute pointer-events-auto transition-all duration-500 ease-out",
          "w-[calc(100vw-32px)] sm:w-auto",
          isAnimating ? "opacity-0 scale-95" : "opacity-100 scale-100"
        )}
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
          maxWidth: 'min(380px, calc(100vw - 32px))',
          minWidth: 'min(320px, calc(100vw - 32px))',
        }}
      >
        <Card className="bg-card border-border shadow-2xl overflow-hidden">
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-primary/20 to-primary/5 px-3 sm:px-4 py-2 sm:py-3 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                </div>
                <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">
                  Step {currentStep + 1} of {steps.length}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive"
                onClick={endTour}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="p-3 sm:p-4">
            <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1 sm:mb-2">
              {currentTourStep.title}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {currentTourStep.description}
            </p>
          </div>

          {/* Progress bar */}
          <div className="px-3 sm:px-4 pb-2">
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between p-3 sm:p-4 pt-2 border-t border-border/50 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={prevStep}
              disabled={currentStep === 0}
              className="gap-1 text-xs sm:text-sm px-2 sm:px-3"
            >
              <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Previous</span>
              <span className="xs:hidden">Prev</span>
            </Button>

            {/* Step dots - hidden on very small screens */}
            <div className="hidden sm:flex items-center gap-1">
              {steps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToStep(index)}
                  className={cn(
                    "h-2 w-2 rounded-full transition-all duration-300",
                    index === currentStep
                      ? "bg-primary w-6"
                      : index < currentStep
                      ? "bg-primary/50"
                      : "bg-muted-foreground/30"
                  )}
                />
              ))}
            </div>

            {/* Mobile step indicator */}
            <span className="sm:hidden text-[10px] text-muted-foreground">
              {currentStep + 1}/{steps.length}
            </span>

            <Button
              size="sm"
              onClick={nextStep}
              className="gap-1 text-xs sm:text-sm px-2 sm:px-3"
            >
              {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
              <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>

          {/* Skip Tour Button */}
          <div className="px-3 sm:px-4 pb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={endTour}
              className="w-full text-xs text-muted-foreground hover:text-foreground"
            >
              Skip Tour
            </Button>
          </div>

          {/* Keyboard hint - hidden on mobile */}
          <div className="hidden sm:block px-4 pb-3">
            <p className="text-[10px] text-muted-foreground text-center">
              Use <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">←</kbd> <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">→</kbd> arrow keys to navigate • <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Esc</kbd> to exit
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
