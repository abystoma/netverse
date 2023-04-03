const router = require('express').Router();
const { findById } = require('../models/netspace');
const netspace = require('../models/netspace');
const User = require('../models/user');
const { auth } = require('../utils/middleware');

router.get('/', async (_req, res) => {
  const allSubreddits = await netspace.find({});
  res.json(allSubreddits);
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const netspace = await netspace.findById(id).populate('admin', {
    username: 1,
  });
  res.json(netspace);
});

router.post('/', auth, async (req, res) => {
  const { subredditName, description } = req.body;

  const admin = await User.findById(req.user);

  if (!admin) {
    return res
      .status(404)
      .send({ message: 'User does not exist in database.' });
  }

  const existingSubName = await netspace.findOne({ subredditName });

  if (existingSubName) {
    return res.status(403).send({
      message: `netspace having same name "${subredditName}" already exists. Choose another name.`,
    });
  }

  const newSubreddit = new netspace({
    subredditName,
    description,
    admin: admin._id,
    subscribedBy: [admin._id],
    subscriberCount: 1,
  });

  const savedSubreddit = await newSubreddit.save();

  admin.subscribedSubs = admin.subscribedSubs.concat(savedSubreddit._id);
  await admin.save();

  return res.status(201).json(savedSubreddit);
});

router.patch('/:id', auth, async (req, res) => {
  const { subredditName, description } = req.body;
  const { id } = req.params;

  const admin = await User.findById(req.user);
  const netspace = await netspace.findById(id);

  if (!admin) {
    return res
      .status(404)
      .send({ message: 'User does not exist in database.' });
  }

  if (!netspace) {
    return res.status(404).send({
      message: `netspace with ID: ${id} does not exist in database.`,
    });
  }

  if (netspace.admin.toString() !== admin._id.toString()) {
    return res.status(401).send({ message: 'Access is denied.' });
  }

  if (subredditName) {
    netspace.subredditName = subredditName;
  }

  if (description) {
    netspace.description = description;
  }

  await netspace.save();
  res.status(202).json(netspace);
});

module.exports = router;