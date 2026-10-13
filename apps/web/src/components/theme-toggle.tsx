import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/theme-context';
import { Button } from '../components/ui/button';
import { cn } from '../lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../components/ui/tooltip';

const ThemeToggle = ({ className }: { className?: string }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className={cn(
              'relative overflow-hidden rounded-full transition-all duration-300 hover:bg-accent',
              className,
            )}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {/* The glyphs inherit currentColor rather than hardcoding amber/sky.
                A fixed mid-tone could not clear 3:1 (WCAG 1.4.11) against every
                surface this sits on — it measured 2.05:1 on the light page and
                2.15-2.44:1 on the brand blue. Inheriting also makes the
                `className` call sites pass (e.g. text-primary-foreground on the
                brand panel) actually take effect: they were being overridden. */}
            <div className={`transition-all duration-500 ease-brand ${theme === 'dark' ? 'rotate-90 opacity-0 scale-0 absolute' : 'rotate-0 opacity-100 scale-100'}`}>
              <Sun className="w-5 h-5" />
            </div>
            <div className={`transition-all duration-500 ease-brand ${theme === 'dark' ? 'rotate-0 opacity-100 scale-100' : '-rotate-90 opacity-0 scale-0 absolute'}`}>
              <Moon className="w-5 h-5" />
            </div>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="border-none bg-foreground text-background shadow-lg">
          <p>{theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ThemeToggle;