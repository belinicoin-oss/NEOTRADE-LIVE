/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
      './pages/**/*.{js,jsx}',
      './components/**/*.{js,jsx}',
      './app/**/*.{js,jsx}',
      './src/**/*.{js,jsx}',
    ],
    prefix: "",
    theme: {
    	container: {
    		center: true,
    		padding: '2rem',
    		screens: {
    			'2xl': '1400px'
    		}
    	},
    	extend: {
    		colors: {
    			border: 'hsl(var(--border))',
    			input: 'hsl(var(--input))',
    			ring: 'hsl(var(--ring))',
    			background: 'hsl(var(--background))',
    			foreground: 'hsl(var(--foreground))',
    			primary: {
    				DEFAULT: 'hsl(var(--primary))',
    				foreground: 'hsl(var(--primary-foreground))'
    			},
    			secondary: {
    				DEFAULT: 'hsl(var(--secondary))',
    				foreground: 'hsl(var(--secondary-foreground))'
    			},
    			destructive: {
    				DEFAULT: 'hsl(var(--destructive))',
    				foreground: 'hsl(var(--destructive-foreground))'
    			},
    			muted: {
    				DEFAULT: 'hsl(var(--muted))',
    				foreground: 'hsl(var(--muted-foreground))'
    			},
    			accent: {
    				DEFAULT: 'hsl(var(--accent))',
    				foreground: 'hsl(var(--accent-foreground))'
    			},
    			popover: {
    				DEFAULT: 'hsl(var(--popover))',
    				foreground: 'hsl(var(--popover-foreground))'
    			},
    			card: {
    				DEFAULT: 'hsl(var(--card))',
    				foreground: 'hsl(var(--card-foreground))'
    			},
    			chart: {
    				'1': 'hsl(var(--chart-1))',
    				'2': 'hsl(var(--chart-2))',
    				'3': 'hsl(var(--chart-3))',
    				'4': 'hsl(var(--chart-4))',
    				'5': 'hsl(var(--chart-5))'
    			},
    			sidebar: {
    				DEFAULT: 'hsl(var(--sidebar-background))',
    				foreground: 'hsl(var(--sidebar-foreground))',
    				primary: 'hsl(var(--sidebar-primary))',
    				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
    				accent: 'hsl(var(--sidebar-accent))',
    				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
    				border: 'hsl(var(--sidebar-border))',
    				ring: 'hsl(var(--sidebar-ring))'
    			},
    			// ────────────── NEOTRADE public-website tokens ──────────────
    			// (Imported verbatim from the original NeoTrade tailwind.config.js)
    			app: '#080816',
    			panel: '#0F0F1F',
    			elevated: '#17172B',
    			brand: {
    				DEFAULT: '#8B5CF6',
    				hover: '#A78BFA',
    				dark: '#7C3AED',
    				glow: 'rgba(139, 92, 246, 0.35)'
    			},
    			buy: {
    				DEFAULT: '#00BFA5',
    				hover: '#4CAF50',
    				glow: 'rgba(0, 191, 165, 0.2)'
    			},
    			sell: {
    				DEFAULT: '#E53935',
    				hover: '#F44336',
    				glow: 'rgba(229, 57, 53, 0.2)'
    			},
    			space: {
    				DEFAULT: '#080816',
    				light: '#0F0F1F',
    				dark: '#050510'
    			},
    			electric: {
    				DEFAULT: '#22D3EE',
    				dark: '#0891B2',
    				light: '#67E8F9'
    			},
    			neon: {
    				DEFAULT: '#00BFA5',
    				dark: '#00897B',
    				light: '#4CAF50'
    			},
    			vibrant: {
    				DEFAULT: '#EC4899',
    				dark: '#DB2777',
    				light: '#F472B6'
    			},
    			amber: {
    				DEFAULT: '#f59e0b',
    				dark: '#d97706',
    				light: '#fbbf24'
    			}
    		},
    		fontFamily: {
    			sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
    			display: ['Outfit', 'Inter', 'sans-serif'],
    			body: ['IBM Plex Sans', 'Inter', 'sans-serif'],
    			mono: ['IBM Plex Mono', 'JetBrains Mono', 'monospace']
    		},
    		backgroundImage: {
    			'brand-gradient': 'linear-gradient(135deg, #22D3EE 0%, #8B5CF6 50%, #EC4899 100%)',
    			'brand-gradient-soft': 'linear-gradient(135deg, rgba(34,211,238,0.15) 0%, rgba(139,92,246,0.15) 50%, rgba(236,72,153,0.15) 100%)',
    			'hero-radial': 'radial-gradient(ellipse at top, rgba(139,92,246,0.18), transparent 60%), radial-gradient(ellipse at bottom, rgba(236,72,153,0.12), transparent 60%)'
    		},
    		borderRadius: {
    			lg: 'var(--radius)',
    			md: 'calc(var(--radius) - 2px)',
    			sm: 'calc(var(--radius) - 4px)'
    		},
    		keyframes: {
    			'accordion-down': {
    				from: { height: '0' },
    				to: { height: 'var(--radix-accordion-content-height)' }
    			},
    			'accordion-up': {
    				from: { height: 'var(--radix-accordion-content-height)' },
    				to: { height: '0' }
    			},
    			float: {
    				'0%, 100%': { transform: 'translateY(0px)' },
    				'50%': { transform: 'translateY(-20px)' }
    			},
    			'pulse-glow': {
    				'0%, 100%': { opacity: 1, boxShadow: '0 0 20px rgba(139, 92, 246, 0.4)' },
    				'50%': { opacity: 0.8, boxShadow: '0 0 40px rgba(236, 72, 153, 0.6)' }
    			},
    			'slide-up': {
    				'0%': { opacity: 0, transform: 'translateY(20px)' },
    				'100%': { opacity: 1, transform: 'translateY(0)' }
    			},
    			fadeIn: {
    				'0%': { opacity: 0 },
    				'100%': { opacity: 1 }
    			},
    			slideInUp: {
    				'0%': { opacity: 0, transform: 'translateY(30px)' },
    				'100%': { opacity: 1, transform: 'translateY(0)' }
    			},
    			scaleIn: {
    				'0%': { opacity: 0, transform: 'scale(0.95)' },
    				'100%': { opacity: 1, transform: 'scale(1)' }
    			},
    			glowPulse: {
    				'0%, 100%': { boxShadow: '0 0 20px rgba(139, 92, 246, 0.25)' },
    				'50%': { boxShadow: '0 0 40px rgba(236, 72, 153, 0.45)' }
    			},
    			gradientShift: {
    				'0%, 100%': { backgroundPosition: '0% 50%' },
    				'50%': { backgroundPosition: '100% 50%' }
    			}
    		},
    		animation: {
    			'accordion-down': 'accordion-down 0.2s ease-out',
    			'accordion-up': 'accordion-up 0.2s ease-out',
    			'float': 'float 6s ease-in-out infinite',
    			'float-delayed': 'float 6s ease-in-out infinite 2s',
    			'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
    			'slide-up': 'slide-up 0.5s ease-out forwards',
    			'spin-slow': 'spin 60s linear infinite',
    			'fade-in': 'fadeIn 0.6s ease-out forwards',
    			'slide-in-up': 'slideInUp 0.6s ease-out forwards',
    			'scale-in': 'scaleIn 0.3s ease-out forwards',
    			'glow-pulse': 'glowPulse 2s ease-in-out infinite',
    			'gradient-shift': 'gradientShift 8s ease infinite'
    		},
    		backdropBlur: {
    			xs: '2px'
    		}
    	}
    },
    plugins: [require("tailwindcss-animate")],
  }
