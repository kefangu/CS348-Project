from models import db, Book, User, Review
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from flask_migrate import Migrate
from sqlalchemy import func
from sqlalchemy import text

app = Flask(__name__)
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:3000", "http://127.0.0.1:3000"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///bookreviews.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)
migrate = Migrate(app, db)

def initialize_database():
    with app.app_context():
        db.create_all()
        if not Book.query.first():
            sample_books = [
                Book(
                    isbn="9780545010221", 
                    title="Harry Potter and the Deathly Hallows",
                    author="J.K. Rowling",
                    published_year=2007,
                    genre="Fantasy"
                ),
                Book(
                    isbn="9780061120084",
                    title="To Kill a Mockingbird",
                    author="Harper Lee",
                    published_year=1960,
                    genre="Classic"
                )
            ]
            db.session.add_all(sample_books)
            db.session.commit()

@app.route('/api/books', methods=['GET'])
def get_books():
    books = Book.query.all()
    return jsonify([{
        'id': book.id,
        'title': book.title,
        'author': book.author,
        'genre': book.genre
    } for book in books])

@app.route('/api/reviews', methods=['GET', 'POST'])
def handle_reviews():
    if request.method == 'POST':
        data = request.json
        
        if not all(k in data for k in ['email', 'book_id', 'rating']):
            return jsonify({"error": "Missing required fields"}), 400
        
        user = User.query.filter_by(email=data['email']).first()
        if not user:
            if 'username' not in data or 'password' not in data:
                return jsonify({"error": "New users must provide username and password"}), 400
                
            hashed_pw = generate_password_hash(data['password'])
            user = User(username=data['username'], email=data['email'], password_hash=hashed_pw)
            db.session.add(user)
        
        existing_review = Review.query.filter_by(
            user_id=user.id,
            book_id=data['book_id']
        ).first()
        if existing_review:
            return jsonify({"error": "You already reviewed this book"}), 400
        
        new_review = Review(
            user_id=user.id,
            book_id=data['book_id'],
            rating=data['rating'],
            comment=data.get('comment', '')
        )
        db.session.add(new_review)
        db.session.commit()
        
        return jsonify({"message": "Review added!", "review_id": f"{user.id}-{data['book_id']}"}), 201
    
    try:
        reviews = Review.query.order_by(Review.created_at.desc()).limit(20).all()
        valid_reviews = []
        for r in reviews:
            if not r.book or not r.user:
                continue
            valid_reviews.append({
                'id': f"{r.user_id}-{r.book_id}",
                'user': r.user.username,
                'book_id': r.book_id,
                'book_title': r.book.title,
                'rating': r.rating,
                'comment': r.comment,
                'created_at': r.created_at.isoformat()
            })
        return jsonify(valid_reviews)
    except Exception as e:
        app.logger.error(f"Error fetching reviews: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500
    
@app.route('/api/reviews/<review_id>', methods=['PUT'])
def update_review(review_id):
    try:
        data = request.get_json()
        user_id, book_id = map(int, review_id.split('-'))
        
        user = User.query.filter_by(
            email=data.get('email')
        ).first()
        
        if not user or user.id != user_id or not check_password_hash(user.password_hash, data.get('password', '')):
            return jsonify({"error": "Unauthorized"}), 403
        
        review = Review.query.filter_by(
            user_id=user_id,
            book_id=book_id
        ).first()
        
        if not review:
            return jsonify({"error": "Review not found"}), 404
            
        review.rating = data.get('rating', review.rating)
        review.comment = data.get('comment', review.comment)
        db.session.commit()
        
        return jsonify({
    "message": "Review updated",
    "review": {
        "id": f"{review.user_id}-{review.book_id}",
        "rating": review.rating,
        "comment": review.comment
    }
})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/reviews/<int:user_id>/<int:book_id>', methods=['DELETE'])
def delete_review(user_id, book_id):
    try:
        data = request.get_json()
        
        user = User.query.filter_by(
            email=data.get('email'),
        ).first()
        
        if not user or user.id != user_id or not check_password_hash(user.password_hash, data.get('password', '')):
            return jsonify({"error": "Unauthorized: Invalid credentials"}), 403
        
        review = Review.query.filter_by(
            user_id=user_id,
            book_id=book_id
        ).first()
        
        if not review:
            return jsonify({"error": "Review not found"}), 404
            
        db.session.delete(review)
        db.session.commit()
        
        return jsonify({
            "message": "Review deleted successfully!",
            "deleted_review": {
                "user_id": review.user_id,
                "book_id": review.book_id
            }
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/reports', methods=['GET'])
def generate_report():
    try:
        genre = request.args.get('genre', 'Fantasy')
        min_rating = int(request.args.get('min_rating', 3))
        
        query = """
            SELECT b.title, AVG(r.rating) as avg_rating, 
                   COUNT(r.*) as review_count
            FROM reviews r
            JOIN books b ON r.book_id = b.id
            WHERE b.genre = :genre AND r.rating >= :min_rating
            GROUP BY b.title
            ORDER BY avg_rating DESC
        """
        result = db.session.execute(query, {
            "genre": genre,
            "min_rating": min_rating
        })
        
        return jsonify([dict(row) for row in result])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/reviews/<review_id>', methods=['GET'])
def get_review(review_id):
    try:
        user_id, book_id = map(int, review_id.split('-'))
        print(f"Querying review: user_id={user_id}, book_id={book_id}")
        
        review = Review.query.filter_by(
            user_id=user_id,
            book_id=book_id
        ).first()
        
        if not review:
            print("Review not found in database")
            return jsonify({"error": "Review not found"}), 404
            
        print(f"Found review: {review}")
        return jsonify({
    "id": f"{review.user_id}-{review.book_id}",
    "user": review.user.username,
    "book_title": review.book.title,
    "rating": review.rating,
    "comment": review.comment,
    "created_at": review.created_at.isoformat()
})
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({"error": str(e)}), 400
    
@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Resource not found"}), 404

@app.errorhandler(500)
def server_error(e):
    return jsonify({"error": "Internal server error"}), 500



@app.route('/api/report/authors', methods=['GET'])
def get_authors():
    authors = db.session.query(Book.author.distinct()).all()
    return jsonify([author[0] for author in authors])


@app.route('/api/report/genres', methods=['GET'])
def get_genres():
    genres = db.session.query(Book.genre.distinct()).all()
    return jsonify([genre[0] for genre in genres])


@app.route('/api/report/stats', methods=['GET'])
def get_review_stats():
    try:
        author = request.args.get('author')
        genre = request.args.get('genre')
        min_rating = int(request.args.get('min_rating', 0))
        max_rating = int(request.args.get('max_rating', 5))

        stmt = text("""
            SELECT 
                b.title,
                b.author,
                b.genre,
                COUNT(r.rating) as review_count,
                AVG(r.rating) as avg_rating
            FROM books b
            JOIN reviews r ON b.id = r.book_id
            WHERE (:author IS NULL OR b.author = :author)
              AND (:genre IS NULL OR b.genre = :genre)
              AND r.rating BETWEEN :min_rating AND :max_rating
            GROUP BY b.id
            ORDER BY avg_rating DESC
        """)

        result = db.session.execute(stmt, {
            'author': author,
            'genre': genre,
            'min_rating': min_rating,
            'max_rating': max_rating
        })

        return jsonify([dict(row) for row in result])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    initialize_database()
    app.run(debug=True, port=5001)