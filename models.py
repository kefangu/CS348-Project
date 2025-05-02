from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Book(db.Model):
    __tablename__ = 'books'
    id = db.Column(db.Integer, primary_key=True)
    isbn = db.Column(db.String(13), unique=True, index=True)
    title = db.Column(db.String(200), nullable=False, index=True)
    author = db.Column(db.String(100), index=True)
    published_year = db.Column(db.Integer)
    genre = db.Column(db.String(50), index=True)

    __table_args__ = (
        db.Index('ix_book_author_genre', 'author', 'genre'),
    )

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255))

class Review(db.Model):
    __tablename__ = 'reviews'
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), primary_key=True)
    book_id = db.Column(db.Integer, db.ForeignKey('books.id'), primary_key=True)
    rating = db.Column(db.Integer, nullable=False)
    comment = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref='reviews')
    book = db.relationship('Book', backref='reviews')

    __table_args__ = (
        db.Index('ix_review_book_created', 'book_id', 'created_at'),
        db.Index('ix_review_user_created', 'user_id', 'created_at'),
        db.Index('ix_review_book_rating', 'book_id', 'rating'),
        db.Index('ix_review_created_rating', 'created_at', 'rating'),
        db.CheckConstraint('rating >= 1 AND rating <= 5', name='check_rating_range'),
    )

    @property
    def id(self):
        return f"{self.user_id}-{self.book_id}"

    @id.setter
    def id(self, value):
        user_id, book_id = value.split('-')
        self.user_id = user_id
        self.book_id = book_id