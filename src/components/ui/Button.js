export const Button = ({ children, variant = 'primary', className = '', disabled, ...props }) => {
  const baseClasses = 'px-6 py-3 rounded-lg font-medium transition-colors w-full';
  const variants = {
    primary: 'bg-secondary text-white hover:bg-primary',
    secondary: 'bg-white text-primary border-2 border-primary hover:bg-primary hover:text-white',
    danger: 'bg-red-500 text-white hover:bg-red-600'
  };

  return (
    <button 
      className={`${baseClasses} ${variants[variant]} ${className} ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};