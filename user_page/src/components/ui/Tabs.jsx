
const Tabs = ({ tabs, activeTab, onTabChange, className = '' }) => {
  return (
    <div className={`border-b border-border ${className}`}>
      <div className="flex w-full">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
                            flex-1 min-w-0 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium
                            border-b-2 transition-colors text-center
                            ${activeTab === tab.id
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }
                        `}
          >
            {tab.icon && <span className="text-lg">{tab.icon}</span>}
            <span className="leading-tight text-xs text-center whitespace-nowrap">{tab.label}</span>
            {tab.badge && (
              <span className="ml-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-error text-white">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Tabs;
