/**
 * Mount all API routes
 */

import { Router } from 'express';
import staking from './staking';
import zoo from './zoo';

const router = Router();

router.use('/staking', staking);
router.use('/zoo', zoo);

export default router;
