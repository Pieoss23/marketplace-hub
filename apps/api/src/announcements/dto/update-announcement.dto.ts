import type { UpdateAnnouncementRequest } from '@marketplace-hub/contracts';
import { CreateAnnouncementDto } from './create-announcement.dto';

/** `UpdateAnnouncementRequest` is a full replace, identical in shape to `CreateAnnouncementRequest`. */
export class UpdateAnnouncementDto
  extends CreateAnnouncementDto
  implements UpdateAnnouncementRequest {}
