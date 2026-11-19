const mongoose = require('mongoose');

const technicalChallengeSchema = new mongoose.Schema({
  challenge: { type: String, required: true, trim: true },
  details: { type: String, required: true, trim: true }
}, { _id: false });

const unforgeableSignalSchema = new mongoose.Schema({
  signal: { type: String, required: true, trim: true },
  genuineMobile: { type: String, required: true, trim: true },
  desktopEmulation: { type: String, required: true, trim: true }
}, { _id: false });

const architecturalSolutionSchema = new mongoose.Schema({
  overview: { type: String, required: true, trim: true },
  unforgeableSignals: { type: [unforgeableSignalSchema], required: true }
}, { _id: false });

const caseStudySchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  image: { type: String, required: true},
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  category: { type: String, required: true, trim: true, index: true },
  executiveSummary: { type: String, required: true, trim: true },
  technicalChallenges: { type: [technicalChallengeSchema], required: true },
  architecturalSolution: { type: architecturalSolutionSchema, required: true },
  implementationSnippet: { type: String, required: true },
  results: { type: [{ type: String, trim: true }], required: true }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

module.exports = mongoose.model('CaseStudy', caseStudySchema);