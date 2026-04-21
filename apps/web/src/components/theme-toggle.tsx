import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/theme-context';
import { Button } from '../components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../components/ui/tooltip';

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="relative overflow-hidden transition-all duration-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
            aria-label={theme === 'dark' ? "Switch to light mode" : "Switch to dark mode"}
          >
            <div className={`transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${theme === 'dark' ? 'rotate-90 opacity-0 scale-0 absolute' : 'rotate-0 opacity-100 scale-100'}`}>
              <Sun className="w-5 h-5 text-orange-500 hover:text-orange-600 transition-colors" />
            </div>
            <div className={`transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${theme === 'dark' ? 'rotate-0 opacity-100 scale-100' : '-rotate-90 opacity-0 scale-0 absolute'}`}>
              <Moon className="w-5 h-5 text-blue-500 hover:text-blue-400 transition-colors" />
            </div>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-gray-800 text-white dark:bg-gray-100 dark:text-gray-900 border-none shadow-lg">
          <p>{theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ThemeToggle;