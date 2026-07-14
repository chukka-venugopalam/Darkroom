import React, { useState, useEffect } from 'react';
import DevelopingPrint from './DevelopingPrint';

export default function ProjectPrint({ project, isDaylightMode }) {
  const [isDetailsVisible, setIsDetailsVisible] = useState(isDaylightMode);

  useEffect(() => {
    if (isDaylightMode) {
      setIsDetailsVisible(true);
    }
  }, [isDaylightMode]);

  const handleDeveloped = () => {
    setIsDetailsVisible(true);
  };

  return (
    <div 
      className="project-showcase" 
      id={`project-${project.id}`}
      style={{ minHeight: '90vh', padding: '6rem 0', borderBottom: '1px solid var(--border-color)' }}
    >
      <div className="section-label">{project.category}</div>
      
      <div className="print-board-container">
        <div className="print-board">
          <DevelopingPrint
            src={project.src}
            alt={project.title}
            width={640}
            height={480}
            projectId={`hero-${project.id}`}
            isDaylightMode={isDaylightMode}
            onDevelopedComplete={handleDeveloped}
          />
          
          <div className={`print-details ${isDetailsVisible ? 'visible' : ''}`}>
            <div>
              <h3 className="print-title">{project.title}</h3>
              <div className="print-meta">
                YEAR: {project.year} / MEDIUM: SILVER GELATIN PRINT
              </div>
            </div>
            
            <div className="print-description">
              {project.desc}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
