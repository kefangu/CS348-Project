import { useEffect, useState } from 'react';
import axios from 'axios';

function App() {
  const [books, setBooks] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState({
    book_id: '',
    email: '',
    username: '',
    password: '',
    rating: 5,
    comment: ''
  });
  const [editingReview, setEditingReview] = useState(null);
  const [editCredentials, setEditCredentials] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ===== NEW STATE FOR REPORT INTERFACE =====
  const [reportFilters, setReportFilters] = useState({
    author: '',
    genre: '',
    minRating: 0,
    maxRating: 5
  });
  const [reportData, setReportData] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [genres, setGenres] = useState([]);
  // ===== END NEW STATE =====

  // Styles
  const styles = {
    reviewSection: {
      maxWidth: '600px',
      margin: '2rem auto',
      padding: '1.5rem',
      background: '#f8f9fa',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    reviewSectionH2: {
      marginTop: 0,
      color: '#343a40'
    },
    formGroup: {
      marginBottom: '1.2rem'
    },
    formGroupLabel: {
      display: 'block',
      marginBottom: '0.5rem',
      fontWeight: '500'
    },
    formControl: {
      width: '100%',
      padding: '0.6rem',
      border: '1px solid #ced4da',
      borderRadius: '4px',
      fontSize: '1rem'
    },
    textarea: {
      minHeight: '100px'
    },
    submitBtn: {
      backgroundColor: '#007bff',
      color: 'white',
      padding: '0.7rem 1.5rem',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '1rem',
      transition: 'background-color 0.2s'
    },
    submitBtnHover: {
      backgroundColor: '#0069d9'
    },
    modalOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      zIndex: 999
    },
    modalContent: {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: 'white',
      padding: '2rem',
      borderRadius: '8px',
      boxShadow: '0 0 20px rgba(0,0,0,0.3)',
      zIndex: 1000,
      width: '90%',
      maxWidth: '500px'
    }
  };

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [booksRes, reviewsRes] = await Promise.all([
          axios.get('http://localhost:5001/api/books'),
          axios.get('http://localhost:5001/api/reviews')
        ]);
        setBooks(booksRes.data);
        setReviews(reviewsRes.data);
      } catch (err) {
        setError(err.response?.data?.error || err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ===== NEW USEFFECT FOR REPORT FILTERS =====
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const [authorsRes, genresRes] = await Promise.all([
          axios.get('http://localhost:5001/api/report/authors'),
          axios.get('http://localhost:5001/api/report/genres')
        ]);
        setAuthors(authorsRes.data);
        setGenres(genresRes.data);
      } catch (err) {
        setError(err.response?.data?.error || err.message);
      }
    };
    fetchFilters();
  }, []);
  // ===== END NEW USEFFECT =====

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const res = await axios.post('http://localhost:5001/api/reviews', newReview);
      const reviewsRes = await axios.get('http://localhost:5001/api/reviews');
      setReviews(reviewsRes.data);
      setNewReview({
        book_id: '',
        email: '',
        username: '',
        password: '',
        rating: 5,
        comment: ''
      });
      alert('Review added successfully!');
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const handleUpdateReview = async (e) => {
    e.preventDefault();

    if (!editingReview) return;

    try {
      const response = await axios.put(
        `http://localhost:5001/api/reviews/${editingReview.id}`,
        {
          rating: editingReview.rating,
          comment: editingReview.comment,
          email: editCredentials.email,
          password: editCredentials.password
        }
      );

      const reviewsRes = await axios.get('http://localhost:5001/api/reviews');
      setReviews(reviewsRes.data);
      setEditingReview(null);
    } catch (err) {
      console.error('Update failed:', err.response?.data);
      setError(err.response?.data?.error || 'Update failed');
    }
  };

  const handleDeleteReview = async (review) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;

    try {
      const email = prompt('Enter your email:');
      const password = prompt('Enter your password:');

      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      const [user_id, book_id] = review.id.split('-').map(Number);

      const response = await axios.delete(
        `http://localhost:5001/api/reviews/${user_id}/${book_id}`,
        {
          data: {
            email,
            password
          }
        }
      );

      const reviewsRes = await axios.get('http://localhost:5001/api/reviews');
      setReviews(reviewsRes.data);
      alert('Review deleted successfully!');
    } catch (err) {
      alert(`Delete failed: ${err.response?.data?.error || err.message}`);
    }
  };

  // ===== NEW REPORT GENERATION FUNCTION =====
  const generateReport = async () => {
    try {
      const params = new URLSearchParams();
      if (reportFilters.author) params.append('author', reportFilters.author);
      if (reportFilters.genre) params.append('genre', reportFilters.genre);
      params.append('min_rating', reportFilters.minRating);
      params.append('max_rating', reportFilters.maxRating);

      const res = await axios.get(`http://localhost:5001/api/report/stats?${params}`);
      setReportData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };
  // ===== END NEW FUNCTION =====

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewReview(prev => ({
      ...prev,
      [name]: name === 'rating' ? parseInt(value) : value
    }));
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditingReview(prev => ({
      ...prev,
      [name]: name === 'rating' ? parseInt(value) : value
    }));
  };

  const handleEditCredentialChange = (e) => {
    const { name, value } = e.target;
    setEditCredentials(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  const handleEditClick = (review) => {
    const [userId, bookId] = review.id.split('-').map(Number);

    setEditingReview({
      ...review,
      user_id: userId,
      book_id: bookId
    });

    setEditCredentials({
      email: '',
      password: ''
    });
  };

  return (
    <div className="container">
      <h1>Book Reviews</h1>

      <section className="book-list">
        <h2>Books</h2>
        <ul>
          {books.map(book => (
            <li key={book.id}>
              <strong>{book.title}</strong> by {book.author} ({book.genre})
            </li>
          ))}
        </ul>
      </section>

      <section style={styles.reviewSection}>
        <h2 style={styles.reviewSectionH2}>Submit a Review</h2>
        <form onSubmit={handleSubmitReview}>
          <div style={styles.formGroup}>
            <label style={styles.formGroupLabel}>Book:</label>
            <select
              name="book_id"
              value={newReview.book_id}
              onChange={handleInputChange}
              style={styles.formControl}
              required
            >
              <option value="">Select a book</option>
              {books.map(book => (
                <option key={book.id} value={book.id}>{book.title}</option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.formGroupLabel}>Email:</label>
            <input
              type="email"
              name="email"
              value={newReview.email}
              onChange={handleInputChange}
              style={styles.formControl}
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.formGroupLabel}>Username:</label>
            <input
              type="text"
              name="username"
              value={newReview.username}
              onChange={handleInputChange}
              style={styles.formControl}
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.formGroupLabel}>Password:</label>
            <input
              type="password"
              name="password"
              value={newReview.password}
              onChange={handleInputChange}
              style={styles.formControl}
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.formGroupLabel}>Rating:</label>
            <select
              name="rating"
              value={newReview.rating}
              onChange={handleInputChange}
              style={styles.formControl}
            >
              {[1, 2, 3, 4, 5].map(num => (
                <option key={num} value={num}>{num} ⭐</option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.formGroupLabel}>Comment:</label>
            <textarea
              name="comment"
              value={newReview.comment}
              onChange={handleInputChange}
              style={{...styles.formControl, ...styles.textarea}}
            />
          </div>

          <button
            type="submit"
            style={styles.submitBtn}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = styles.submitBtnHover.backgroundColor}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = styles.submitBtn.backgroundColor}
          >
            Submit Review
          </button>
        </form>
      </section>

      {/* ===== NEW REPORT INTERFACE SECTION ===== */}
      <section style={{...styles.reviewSection, marginTop: '2rem'}}>
        <h2 style={styles.reviewSectionH2}>Book Review Statistics</h2>

        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
          <div style={styles.formGroup}>
            <label style={styles.formGroupLabel}>Author:</label>
            <select
              name="author"
              value={reportFilters.author}
              onChange={(e) => setReportFilters({...reportFilters, author: e.target.value})}
              style={styles.formControl}
            >
              <option value="">All Authors</option>
              {authors.map(author => (
                <option key={author} value={author}>{author}</option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.formGroupLabel}>Genre:</label>
            <select
              name="genre"
              value={reportFilters.genre}
              onChange={(e) => setReportFilters({...reportFilters, genre: e.target.value})}
              style={styles.formControl}
            >
              <option value="">All Genres</option>
              {genres.map(genre => (
                <option key={genre} value={genre}>{genre}</option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.formGroupLabel}>Min Rating:</label>
            <select
              name="minRating"
              value={reportFilters.minRating}
              onChange={(e) => setReportFilters({...reportFilters, minRating: e.target.value})}
              style={styles.formControl}
            >
              {[0, 1, 2, 3, 4].map(num => (
                <option key={num} value={num}>{num}+ ⭐</option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.formGroupLabel}>Max Rating:</label>
            <select
              name="maxRating"
              value={reportFilters.maxRating}
              onChange={(e) => setReportFilters({...reportFilters, maxRating: e.target.value})}
              style={styles.formControl}
            >
              {[1, 2, 3, 4, 5].map(num => (
                <option key={num} value={num}>Up to {num} ⭐</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={generateReport}
          style={{...styles.submitBtn, marginTop: '1rem'}}
        >
          Generate Report
        </button>

        {reportData.length > 0 && (
          <div style={{marginTop: '2rem'}}>
            <h3>Report Results</h3>
            <table style={{width: '100%', borderCollapse: 'collapse'}}>
              <thead>
                <tr style={{backgroundColor: '#f2f2f2'}}>
                  <th style={{padding: '0.5rem', border: '1px solid #ddd'}}>Book</th>
                  <th style={{padding: '0.5rem', border: '1px solid #ddd'}}>Author</th>
                  <th style={{padding: '0.5rem', border: '1px solid #ddd'}}>Genre</th>
                  <th style={{padding: '0.5rem', border: '1px solid #ddd'}}>Reviews</th>
                  <th style={{padding: '0.5rem', border: '1px solid #ddd'}}>Avg Rating</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map((item, index) => (
                  <tr key={index} style={{borderBottom: '1px solid #ddd'}}>
                    <td style={{padding: '0.5rem', border: '1px solid #ddd'}}>{item.title}</td>
                    <td style={{padding: '0.5rem', border: '1px solid #ddd'}}>{item.author}</td>
                    <td style={{padding: '0.5rem', border: '1px solid #ddd'}}>{item.genre}</td>
                    <td style={{padding: '0.5rem', border: '1px solid #ddd'}}>{item.review_count}</td>
                    <td style={{padding: '0.5rem', border: '1px solid #ddd'}}>
                      {item.avg_rating.toFixed(1)} ⭐
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {/* ===== END REPORT INTERFACE ===== */}

      {/* Edit Review Modal */}
      {editingReview && (
        <>
          <div style={styles.modalOverlay} onClick={() => setEditingReview(null)}></div>
          <div style={styles.modalContent}>
            <h3>Edit Review for {editingReview.book_title}</h3>
            {error && <div style={{color: 'red', marginBottom: '1rem'}}>{error}</div>}
            <form onSubmit={handleUpdateReview}>
              <div style={styles.formGroup}>
                <label style={styles.formGroupLabel}>Your Email:</label>
                <input
                  type="email"
                  name="email"
                  value={editCredentials.email}
                  onChange={handleEditCredentialChange}
                  style={styles.formControl}
                  required
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.formGroupLabel}>Your Password:</label>
                <input
                  type="password"
                  name="password"
                  value={editCredentials.password}
                  onChange={handleEditCredentialChange}
                  style={styles.formControl}
                  required
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.formGroupLabel}>Rating:</label>
                <select
                  name="rating"
                  value={editingReview.rating}
                  onChange={handleEditInputChange}
                  style={styles.formControl}
                >
                  {[1, 2, 3, 4, 5].map(num => (
                    <option key={num} value={num}>{num} ⭐</option>
                  ))}
                </select>
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.formGroupLabel}>Comment:</label>
                <textarea
                  name="comment"
                  value={editingReview.comment}
                  onChange={handleEditInputChange}
                  style={{...styles.formControl, ...styles.textarea}}
                />
              </div>
              
              <button 
                type="submit" 
                style={styles.submitBtn}
              >
                Save Changes
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setEditingReview(null);
                  setEditCredentials({ email: '', password: '' });
                }}
                style={{
                  ...styles.submitBtn,
                  backgroundColor: '#6c757d',
                  marginLeft: '0.5rem'
                }}
              >
                Cancel
              </button>
            </form>
          </div>
        </>
      )}

      <section className="reviews-list">
        <h2>Recent Reviews</h2>
        {reviews.length === 0 ? (
          <p>No reviews yet. Be the first to review!</p>
        ) : (
          <ul>
            {reviews.map(review => (
              <li key={`${review.user_id}-${review.book_id}`}>
                <div className="review-header">
                  <strong>{review.user}</strong> rated {review.book_title}
                  <button onClick={() => handleEditClick(review)}>✏️ Edit</button>
                  <button onClick={() => handleDeleteReview(review)}>🗑️ Delete</button>
                </div>
                <div className="rating">Rating: {'⭐'.repeat(review.rating)}</div>
                {review.comment && <p>"{review.comment}"</p>}
                <small>{new Date(review.created_at).toLocaleString()}</small>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default App;