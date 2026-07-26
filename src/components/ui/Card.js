export const Card = ({ children, className = '', onClick }) => {
    return (
      <div 
        className={`bg-white rounded-lg border border-gray-200 p-6 shadow-sm ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} ${className}`}
        onClick={onClick}
      >
        {children}
      </div>
    );
  };