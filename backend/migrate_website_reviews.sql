-- Migration script to create website_reviews table
-- Run this if the table doesn't exist

USE tripmate_db;

-- Website reviews table (for reviewing the website itself, not trips)
CREATE TABLE IF NOT EXISTS website_reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    low_rating_feedback JSON, -- Stores array of selected feedback reasons for 1-2 star ratings
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE(user_id), -- One review per user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_website_reviews_user_id ON website_reviews(user_id);

