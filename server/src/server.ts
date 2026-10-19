import mongoose from 'mongoose';
import { env } from './config/env';
import { createApp } from './app';
import { loadPermissionOverrides } from './services/admin.service';
mongoose.connect(env.MONGODB_URI).then(loadPermissionOverrides).then(() => createApp().listen(env.PORT, () => console.log(`API on :${env.PORT}`)));
