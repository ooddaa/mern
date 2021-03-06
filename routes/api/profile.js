const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { check, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const request = require('request');
const config = require('config');
const Profile = require('../../models/Profile');
const User = require('../../models/User');
const Post = require('../../models/Post');

// @route   GET api/profile/me
// @desc    Get current users profile
// @access  Private
router.get('/me', auth, async (req, res) => {
    try {
        // https://mongoosejs.com/docs/populate.html
        const profile =
            await Profile.findOne({ user: req.user.id })
                .populate('user', ['name', 'avatar']);

        if (!profile) {
            return res.status(400).json({ msg: 'There is no profile for this user' });
        }

        return res.json(profile);
    } catch (error) {
        console.error(error.message);
        return res.status(500).send('Server Error');
    }
})

// @route   POST api/profile
// @desc    Create or Update user profile
// @access  Private
router.post('/', [auth, [
    check('status', 'Status is required').not().isEmpty(),
    check('skills', 'Please add your skills').not().isEmpty(),
]], async (req, res) => {

    // Check for body errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
    }

    const {
        // user, // users don't specify themselves explicitly, they pass their JWT aka 'result of registration'
        company,
        website,
        location,
        status,
        skills,
        bio,
        githubusername,
        youtube,
        twitter,
        facebook,
        instagram,
        linkedin
    } = req.body;

    // Build profileFields object
    const profileFields = {};

    profileFields.user = req.user.id;

    if (company) profileFields.company = company;
    if (website) profileFields.website = website;
    if (location) profileFields.location = location;
    if (status) profileFields.status = status;
    if (bio) profileFields.bio = bio;
    if (githubusername) profileFields.githubusername = githubusername;
    if (skills) {
        profileFields.skills = skills.split(',').map(sk => sk.trim());
    }

    // Build social object
    profileFields.social = {};
    if (youtube) profileFields.social.youtube = youtube;
    if (twitter) profileFields.social.twitter = twitter;
    if (facebook) profileFields.social.facebook = facebook;
    if (instagram) profileFields.social.instagram = instagram;
    if (linkedin) profileFields.social.linkedin = linkedin;

    // Make sure this user has a Register Profile
    try {
        let profile = await Profile.findOne({ user: req.user.id });

        if (profile) {
            // Update 
            profile = await Profile.findOneAndUpdate(
                { user: req.user.id },
                { $set: profileFields },
                { new: true }
            );

            // return res.status(200).json({ msg: 'Profile has been updated', profile });
            return res.status(200).send(profile);
        }

        // Create new Profile
        profile = new Profile(profileFields);

        // !WRITE! to database
        await profile.save();

        // return res.status(200).json({ msg: 'New profile saved', profile });
        return res.status(200).json(profile);

    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
})

// @route   GET api/profiles/all
// @desc    Get all profiles
// @access  Public
router.get('/all', async (req, res) => {
    try {
        const profiles = await Profile.find().populate('user', ['name', 'avatar']);

        return res.status(200).send(profiles);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
})

// @route   GET api/profile/user/:user_id
// @desc    Get profile by user ID
// @access  Public
router.get('/user/:user_id', async (req, res) => {
    try {
        const profile =
            await Profile.findOne({ user: req.params.user_id })
                .populate('user', ['name', 'avatar']);

        if (!profile) {
            return res.status(400).json({ msg: "Profile not found" });
        }
        return res.json(profile);
    } catch (error) {
        console.error('/api/profile/user/:user_id error.message', error.message);
        if (error.kind == 'ObjectId') {
            return res.status(400).json({ msg: "Profile not found" });
        }
        return res.status(500).send('Server error');
    }
})

// @route   DELETE api/profile/user
// @desc    Delete profile and user
// @access  Private
router.delete('/', auth, async (req, res) => {
    try {
        // Delete user posts
        await Post.deleteMany({ user: req.user.id });

        // Delete profile
        await Profile.findOneAndRemove({ user: req.user.id });

        // Delete user
        await User.findOneAndRemove({ _id: req.user.id });

        return res.json({ msg: `User deleted` });
    } catch (error) {
        console.error(error.message);
        if (error.kind == 'ObjectId') {
            return res.status(400).json({ msg: "Profile not found" });
        }
        return res.status(500).send('Server error');
    }
})

// @route   PUT api/profile/experience
// @desc    Add user experience
// @access  Private
router.put('/experience', [auth,
    check("title", "Title is required").not().isEmpty(),
    check("company", "Company is required").not().isEmpty(),
    check("from", "From which date is required").not().isEmpty(),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
    }

    try {
        const profile = await Profile.findOne({ user: req.user.id });
        if (!profile) {
            return res.status(500).json({ msg: 'Profile not found' });
        }

        const {
            title,
            company,
            location,
            from,
            to,
            current,
            description,
        } = req.body;

        const newExp = {};
        if (title) newExp.title = title;
        if (company) newExp.company = company;
        if (location) newExp.location = location;
        if (from) newExp.from = from;
        if (to) newExp.to = to;
        if (current) newExp.current = current;
        if (description) newExp.description = description;

        // add to the beginning 
        profile.experience.unshift(newExp);

        // don't forget to save to DB
        await profile.save();

        return res.send(profile);

    } catch (error) {
        console.error(error.message);
        res.status(500).json({ msg: error.message });
    }
})

// @route   DELETE api/profile/experience/:exp_id
// @desc    Delete user's experience by its id
// @access  Private
router.delete('/experience/:exp_id', auth, async (req, res) => {
    try {
        const profile = await Profile.findOne({ user: req.user.id });
        if (!profile) {
            return res.status(418).json({ msg: 'Profile not found' });
        }

        profile.experience =
            profile.experience.filter(exp => exp.id !== req.params.exp_id);

        // this one also works
        // const removeIndex = profile.experience.map(item => item.id).indexOf(req.params.exp_id);
        // profile.experience.splice(removeIndex, 1);
        await profile.save();

        return res.send(profile);

    } catch (error) {
        console.error(error.message);
        res.status(500).json({ msg: error.message });
    }
})

// @route   PUT api/profile/education
// @desc    Add user education
// @access  Private
router.put('/education', [auth,
    check("school", "School is required").not().isEmpty(),
    check("degree", "Degree is required").not().isEmpty(),
    check("from", "From which date is required").not().isEmpty(),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
    }

    try {
        const profile = await Profile.findOne({ user: req.user.id });
        if (!profile) {
            return res.status(500).json({ msg: 'Profile not found' });
        }

        const {
            school,
            degree,
            fieldofstudy,
            from,
            to,
            current,
            description,
        } = req.body;

        const newEd = {};
        if (school) newEd.school = school;
        if (degree) newEd.degree = degree;
        if (fieldofstudy) newEd.fieldofstudy = fieldofstudy;
        if (from) newEd.from = from;
        if (to) newEd.to = to;
        if (current) newEd.current = current;
        if (description) newEd.description = description;

        // add to the beginning 
        profile.education.unshift(newEd);

        // don't forget to save to DB
        await profile.save();

        return res.send(profile);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ msg: error.message });
    }
})

// @route   DELETE api/profile/education/:ed_id
// @desc    Delete user's education by its id
// @access  Private
router.delete('/education/:ed_id', auth, async (req, res) => {
    try {
        const profile = await Profile.findOne({ user: req.user.id });
        if (!profile) {
            return res.status(418).json({ msg: 'Profile not found' });
        }

        profile.education =
            profile.education.filter(exp => exp.id !== req.params.ed_id);

        // should we inform user that there's no such education to match supplied ed_id?

        await profile.save();

        return res.send(profile);

    } catch (error) {
        console.error(error.message);
        res.status(500).json({ msg: error.message });
    }
})

// @route   GET api/profile/github/:username
// @desc    Get user repos from Github
// @access  Public
router.get('/github/:username', async (req, res) => {
    try {
        const options = {
            uri: `https://api.github.com/users/${req.params.username}/repos?pre+page=5&sort=created:asc&client_id=${config.get("githubClientId")}&client_secret=${config.get("githubSecret")}`,
            method: 'GET',
            headers: { 'user-agent': 'node.js' },
        };

        request(options, (error, response, body) => {
            if (error) console.error(error.message);

            if (response.statusCode !== 200) {
                return res.status(404).json({ msg: 'No Github profile found' });
            }

            return res.json(JSON.parse(body));
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
})

module.exports = router
