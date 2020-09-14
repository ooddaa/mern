import { GET_POSTS, POST_ERROR, UPDATE_LIKES } from '../actions/types';

const initialState = {
    posts: [],
    post: null,
    loading: true,
    error: {}
}

export default function (state = initialState, { type, payload }) {
    switch (type) {
        case GET_POSTS:
            return {
                ...state,
                posts: payload,
                loading: false
            }
        case POST_ERROR:
            return {
                ...state,
                loading: false,
                error: payload
            }
        case UPDATE_LIKES:
            return {
                ...state,
                loading: false,
                posts: state.posts.map(post => post._id === payload.id ? { ...post, likes: payload.likes } : post)
            }
        default:
            return state
    }
}