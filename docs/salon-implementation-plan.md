CREATE TABLE salon_services (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  duration INTEGER NOT NULL, -- in minutes
  price DECIMAL(10,2) NOT NULL,
  category VARCHAR(50), -- e.g., 'hair', 'spa', 'nails'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id)
);