import { useState } from 'react';
import './style.css';
import {
  addComment,
  clearError,
  deleteComment,
  editComment,
  selectAllComments,
  selectCanRedo,
  selectCanUndo,
  selectCommentsForPost,
  selectCurrentUserId,
  selectError,
  selectFilteredPosts,
  selectIsPostLiked,
  selectIsPostSaved,
  selectPostReactionCount,
  setCommentSort,
  setFilters,
  switchUser,
  toggleBookmark,
  toggleLike,
  undo,
  redo,
  type Comment,
} from './features/feedSlice';

import { useAppDispatch, useAppSelector } from './app/hooks';

// ========================
// Comment Component
// ========================

type CommentItemProps = {
  comment: Comment;
  allComments: Comment[];
};

function CommentItem({
  comment,
  allComments,
}: CommentItemProps) {
  const dispatch = useAppDispatch();
  const currentUserId = useAppSelector(selectCurrentUserId);

  const [replyText, setReplyText] = useState('');
  const [showReply, setShowReply] = useState(false);

  const isOwner = comment.authorId === currentUserId;

  const replies = allComments.filter(
    (item) => item.parentId === comment.id,
  );

  function handleEdit() {
    const newText = window.prompt(
      'Edit your comment:',
      comment.text,
    );

    if (newText !== null) {
      dispatch(
        editComment({
          commentId: comment.id,
          text: newText,
        }),
      );
    }
  }

  function handleReply() {
    if (!replyText.trim()) return;

    dispatch(
      addComment({
        postId: comment.postId,
        parentId: comment.id,
        text: replyText,
      }),
    );

    setReplyText('');
    setShowReply(false);
  }

  return (
    <div className="comment">
      <div className="comment-content">
        <div className="comment-heading">
          <strong>{comment.author}</strong>

          <span>
            {new Date(comment.createdAt).toLocaleString()}
          </span>
        </div>

        <p>{comment.text}</p>

        <div className="comment-actions">
          <button onClick={() => setShowReply(!showReply)}>
            Reply
          </button>

          {isOwner && (
            <>
              <button onClick={handleEdit}>Edit</button>

              <button
                className="danger-text"
                onClick={() =>
                  dispatch(deleteComment(comment.id))
                }
              >
                Delete
              </button>
            </>
          )}
        </div>

        {showReply && (
          <div className="reply-form">
            <input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write a reply..."
            />

            <button onClick={handleReply}>Send</button>
          </div>
        )}
      </div>

      {replies.length > 0 && (
        <div className="replies">
          {replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              allComments={allComments}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ========================
// Post Component
// ========================

type PostCardProps = {
  post: {
    id: string;
    authorId: string;
    author: string;
    text: string;
    createdAt: string;
  };
};

function PostCard({ post }: PostCardProps) {
  const dispatch = useAppDispatch();

  const liked = useAppSelector((state) =>
    selectIsPostLiked(state, post.id),
  );

  const saved = useAppSelector((state) =>
    selectIsPostSaved(state, post.id),
  );

  const likes = useAppSelector((state) =>
    selectPostReactionCount(state, post.id),
  );

  const comments = useAppSelector(selectAllComments);

  const postComments = useAppSelector((state) =>
    selectCommentsForPost(state, post.id),
  );

  const [commentText, setCommentText] = useState('');

  function handleAddComment() {
    if (!commentText.trim()) return;

    dispatch(
      addComment({
        postId: post.id,
        text: commentText,
      }),
    );

    setCommentText('');
  }

  return (
    <article className="post-card">
      <div className="post-header">
        <div className="avatar">
          {post.author.charAt(0)}
        </div>

        <div>
          <h3>{post.author}</h3>

          <span>
            {new Date(post.createdAt).toLocaleString()}
          </span>
        </div>
      </div>

      <p className="post-text">{post.text}</p>

      <div className="post-stats">
        <span>{likes} reactions</span>
        <span>{postComments.filter((c) => !c.parentId).length} comments</span>
      </div>

      <div className="post-actions">
        <button
          className={liked ? 'active' : ''}
          onClick={() => dispatch(toggleLike(post.id))}
        >
          {liked ? '♥ Liked' : '♡ Like'}
        </button>

        <button
          className={saved ? 'active' : ''}
          onClick={() => dispatch(toggleBookmark(post.id))}
        >
          {saved ? '★ Saved' : '☆ Save'}
        </button>
      </div>

      <div className="comments-section">
        <h4>Comments</h4>

        <div className="add-comment">
          <input
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Write a comment..."
          />

          <button onClick={handleAddComment}>
            Comment
          </button>
        </div>

        <div className="comments-list">
          {postComments
            .filter((comment) => !comment.parentId)
            .map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                allComments={comments.filter(
                  (item) => item.postId === post.id,
                )}
              />
            ))}

          {postComments.filter((c) => !c.parentId).length === 0 && (
            <p className="empty-comments">
              No comments yet. Be the first!
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

// ========================
// Main App
// ========================

function App() {
  const dispatch = useAppDispatch();

  const posts = useAppSelector(selectFilteredPosts);
  const currentUserId = useAppSelector(selectCurrentUserId);

  const error = useAppSelector(selectError);
  const canUndo = useAppSelector(selectCanUndo);
  const canRedo = useAppSelector(selectCanRedo);

  const filters = useAppSelector(
    (state) => state.feed.filters,
  );

  const commentSort = useAppSelector(
    (state) => state.feed.commentSort,
  );

  return (
    <main className="app">
      <header className="page-header">
        <div>
          <p className="eyebrow">SOCIAL NETWORK</p>
          <h1>Community Feed</h1>
          <p className="subtitle">
            Share your thoughts and connect with others.
          </p>
        </div>

        <div className="user-switch">
          <label htmlFor="user">Current user</label>

          <select
            id="user"
            value={currentUserId}
            onChange={(e) =>
              dispatch(switchUser(e.target.value))
            }
          >
            <option value="u1">Alex</option>
            <option value="u2">Sarah</option>
            <option value="u3">John</option>
          </select>
        </div>
      </header>

      {/* Undo / Redo */}

      <section className="journal-bar">
        <div>
          <strong>Operation Journal</strong>
          <p>Undo or redo your last 20 changes.</p>
        </div>

        <div className="journal-actions">
          <button
            disabled={!canUndo}
            onClick={() => dispatch(undo())}
          >
            ↶ Undo
          </button>

          <button
            disabled={!canRedo}
            onClick={() => dispatch(redo())}
          >
            ↷ Redo
          </button>
        </div>
      </section>

      {/* Error Message */}

      {error && (
        <div className="error-message">
          <span>{error}</span>

          <button onClick={() => dispatch(clearError())}>
            ×
          </button>
        </div>
      )}

      {/* Filters */}

      <section className="filter-panel">
        <div className="filter-heading">
          <div>
            <h2>Explore Posts</h2>
            <p>Find posts based on your interests.</p>
          </div>

          <button
            className="reset-button"
            onClick={() => {
              dispatch({
                type: 'feed/resetFilters',
              });
            }}
          >
            Reset filters
          </button>
        </div>

        <input
          className="search-input"
          placeholder="Search posts by keyword..."
          value={filters.keyword}
          onChange={(e) =>
            dispatch(
              setFilters({ keyword: e.target.value }),
            )
          }
        />

        <div className="filter-controls">
          <label className="filter-option">
            <input
              type="checkbox"
              checked={filters.savedOnly}
              onChange={(e) =>
                dispatch(
                  setFilters({ savedOnly: e.target.checked }),
                )
              }
            />
            Saved posts
          </label>

          <label className="filter-option">
            <input
              type="checkbox"
              checked={filters.likedOnly}
              onChange={(e) =>
                dispatch(
                  setFilters({ likedOnly: e.target.checked }),
                )
              }
            />
            Liked posts
          </label>

          <select
            value={filters.authorId}
            onChange={(e) =>
              dispatch(
                setFilters({ authorId: e.target.value }),
              )
            }
          >
            <option value="all">All authors</option>
            <option value="u1">Alex</option>
            <option value="u2">Sarah</option>
            <option value="u3">John</option>
          </select>

          <select
            value={commentSort}
            onChange={(e) =>
              dispatch(
                setCommentSort(
                  e.target.value as 'newest' | 'oldest',
                ),
              )
            }
          >
            <option value="newest">Newest comments</option>
            <option value="oldest">Oldest comments</option>
          </select>
        </div>
      </section>

      {/* Feed */}

      <section className="feed">
        <div className="feed-heading">
          <h2>Latest Posts</h2>
          <span>{posts.length} posts found</span>
        </div>

        {posts.length > 0 ? (
          posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))
        ) : (
          <div className="empty-state">
            <h3>No posts found</h3>
            <p>Try changing your filters or search keyword.</p>
          </div>
        )}
      </section>
    </main>
  );
}

export default App;