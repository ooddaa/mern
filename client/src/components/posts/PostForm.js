import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { addPost, getPosts } from '../../actions/post';

const PostForm = ({ addPost, getPosts }) => {
    const [text, setText] = useState('');
    return (
        <div className="post-form">
            <div className="bg-primary p">
                <h3>Write a Post</h3>
            </div>
            <form className="form my-1" onSubmit={e => {
                e.preventDefault();
                addPost({ text });
                setText('');
                getPosts();
            }}>
                <textarea
                    name="text"
                    cols="30"
                    rows="5"
                    placeholder="Create a post"
                    value={text}
                    onChange={e => setText(e.target.value)}
                    required
                ></textarea>
                <input type="submit" className="btn btn-dark my-1" value="Submit" />
            </form>
        </div>
    )
}

PostForm.propTypes = {
    addPost: PropTypes.func.isRequired,
    getPosts: PropTypes.func.isRequired,
}

export default connect(null, { addPost, getPosts })(PostForm);
