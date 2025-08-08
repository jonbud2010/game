import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../constants/routes';

interface Formation {
  id: string;
  name: string;
  imageUrl: string;
  positions: FormationPosition[];
  percentage: number;
  createdAt: string;
  updatedAt: string;
}

interface FormationPosition {
  position: string;
  x: number;
  y: number;
}

const AdminFormationsPage: React.FC = () => {
  const [formations, setFormations] = useState<Formation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingFormation, setEditingFormation] = useState<Formation | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    positions: [] as FormationPosition[],
    percentage: 0.05 // Default 5%
  });

  const positions = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST', 'CF', 'LF', 'RF'];
  
  // Default formation template (4-4-2)
  const defaultFormation: FormationPosition[] = [
    { position: 'GK', x: 50, y: 10 },
    { position: 'LB', x: 20, y: 25 },
    { position: 'CB', x: 40, y: 25 },
    { position: 'CB', x: 60, y: 25 },
    { position: 'RB', x: 80, y: 25 },
    { position: 'LM', x: 20, y: 50 },
    { position: 'CM', x: 40, y: 50 },
    { position: 'CM', x: 60, y: 50 },
    { position: 'RM', x: 80, y: 50 },
    { position: 'ST', x: 40, y: 75 },
    { position: 'ST', x: 60, y: 75 }
  ];

  useEffect(() => {
    fetchFormations();
  }, []);

  const fetchFormations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/formations');

      if (!response.ok) {
        throw new Error('Fehler beim Laden der Formationen');
      }

      const data = await response.json();
      setFormations(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('auth_token');
      
      const requestBody = {
        name: formData.name,
        positions: formData.positions,
        percentage: formData.percentage
      };

      const response = await fetch(
        editingFormation ? `/api/formations/${editingFormation.id}` : '/api/formations',
        {
          method: editingFormation ? 'PUT' : 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Speichern');
      }

      // Reset form and refresh list
      setFormData({
        name: '',
        positions: [...defaultFormation],
        percentage: 0.05
      });
      setShowCreateForm(false);
      setEditingFormation(null);
      await fetchFormations();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern');
    }
  };

  const handleEdit = (formation: Formation) => {
    setEditingFormation(formation);
    
    // Ensure positions are in the correct format
    let positions = formation.positions || [...defaultFormation];
    
    // Transform any string positions to proper FormationPosition objects
    positions = positions.map((pos, index) => {
      // If it's already a proper object, return as is
      if (typeof pos === 'object' && pos.position && typeof pos.x === 'number' && typeof pos.y === 'number') {
        return pos;
      }
      
      // If it's a string, convert to object with default coordinates
      if (typeof pos === 'string') {
        const defaultPos = defaultFormation.find(dp => dp.position === pos) || defaultFormation[index] || { position: pos, x: 50, y: 75 };
        return {
          position: pos,
          x: defaultPos.x,
          y: defaultPos.y
        };
      }
      
      // Fallback to default formation
      return defaultFormation[index] || { position: 'ST', x: 50, y: 75 };
    });
    
    setFormData({
      name: formation.name,
      positions: positions,
      percentage: formation.percentage || 0.05
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (formationId: string) => {
    if (!confirm('Sind Sie sicher, dass Sie diese Formation löschen möchten?')) {
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/formations/${formationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Löschen');
      }

      await fetchFormations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Löschen');
    }
  };

  const updatePosition = (index: number, field: 'position' | 'x' | 'y', value: string | number) => {
    const updatedPositions = [...formData.positions];
    
    // Ensure the position at index exists and is an object
    if (!updatedPositions[index] || typeof updatedPositions[index] !== 'object') {
      // Create a new position object if it doesn't exist or is invalid
      updatedPositions[index] = {
        position: 'ST',
        x: 50,
        y: 75
      };
    }
    
    // Update the field
    if (field === 'position') {
      updatedPositions[index]!.position = value as string;
    } else {
      updatedPositions[index]![field] = Number(value);
    }
    
    setFormData({...formData, positions: updatedPositions});
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Lade Formationen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-formations">
      <div className="container">
        <div className="admin-header">
          <div className="admin-breadcrumb">
            <Link to={ROUTES.ADMIN}>Admin</Link> &gt; Formationen verwalten
          </div>
          <h1>Formationen verwalten</h1>
          <div className="admin-actions">
            <button 
              className="btn btn-primary"
              onClick={() => {
                setShowCreateForm(true);
                setEditingFormation(null);
                setFormData({
                  name: '',
                  positions: [...defaultFormation],
                  percentage: 0.05
                });
              }}
            >
              Neue Formation erstellen
            </button>
          </div>
        </div>

        {error && (
          <div className="error-message">
            {error}
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}

        {showCreateForm && (
          <div className="form-modal">
            <div className="form-modal-content form-modal-large">
              <h2>{editingFormation ? 'Formation bearbeiten' : 'Neue Formation erstellen'}</h2>
              <form onSubmit={handleSubmit} className="formation-form">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="name">Formation Name *</label>
                    <input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="z.B. 4-4-2 Klassisch"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="percentage">Pack Draw Percentage *</label>
                    <input
                      id="percentage"
                      type="number"
                      min="0.1"
                      max="100"
                      step="0.1"
                      value={(formData.percentage * 100).toFixed(1)}
                      onChange={(e) => setFormData({...formData, percentage: parseFloat(e.target.value) / 100})}
                      placeholder="5.0"
                      required
                    />
                    <small>Wahrscheinlichkeit in % (0.1 - 100.0)</small>
                  </div>
                </div>

                <div className="formation-editor">
                  <h3>Positionen definieren</h3>
                  <div className="formation-visual">
                    <div className="field">
                      {formData.positions.map((pos, index) => (
                        <div
                          key={index}
                          className="position-marker"
                          style={{
                            left: `${pos.x}%`,
                            top: `${pos.y}%`
                          }}
                        >
                          <span className="position-label">{pos.position}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="positions-list">
                    <h4>Positionen bearbeiten</h4>
                    <div className="positions-grid">
                      {formData.positions.map((pos, index) => (
                        <div key={index} className="position-editor">
                          <div className="position-number">{index + 1}</div>
                          <select
                            value={pos.position}
                            onChange={(e) => updatePosition(index, 'position', e.target.value)}
                          >
                            {positions.map(position => (
                              <option key={position} value={position}>{position}</option>
                            ))}
                          </select>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={pos.x}
                            onChange={(e) => updatePosition(index, 'x', e.target.value)}
                            placeholder="X"
                          />
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={pos.y}
                            onChange={(e) => updatePosition(index, 'y', e.target.value)}
                            placeholder="Y"
                          />
                        </div>
                      ))}
                    </div>
                    <p className="help-text">
                      Koordinaten sind Prozentangaben (0-100). X = links nach rechts, Y = oben nach unten.
                    </p>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowCreateForm(false)}>
                    Abbrechen
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingFormation ? 'Speichern' : 'Erstellen'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="formations-list">
          <div className="list-header">
            <h2>Alle Formationen ({formations.length})</h2>
          </div>
          
          {formations.length === 0 ? (
            <div className="empty-state">
              <p>Noch keine Formationen erstellt.</p>
            </div>
          ) : (
            <div className="formations-grid">
              {formations.map(formation => (
                <div key={formation.id} className="formation-card">
                  <div className="formation-info">
                    <h3>{formation.name}</h3>
                    <p>{Array.isArray(formation.positions) ? formation.positions.length : 0} Positionen</p>
                    <p className="formation-percentage">Pack Rate: {((formation.percentage || 0) * 100).toFixed(1)}%</p>
                    <div className="formation-positions">
                      {Array.isArray(formation.positions) && formation.positions.slice(0, 5).map((pos, idx) => (
                        <span key={idx} className="position-tag">{pos.position}</span>
                      ))}
                      {Array.isArray(formation.positions) && formation.positions.length > 5 && (
                        <span className="position-more">+{formation.positions.length - 5}</span>
                      )}
                    </div>
                  </div>
                  <div className="formation-actions">
                    <button 
                      className="btn btn-small btn-secondary"
                      onClick={() => handleEdit(formation)}
                    >
                      Bearbeiten
                    </button>
                    <button 
                      className="btn btn-small btn-danger"
                      onClick={() => handleDelete(formation.id)}
                    >
                      Löschen
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminFormationsPage;