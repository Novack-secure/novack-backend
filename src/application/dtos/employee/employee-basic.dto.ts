import { ApiProperty } from '@nestjs/swagger';

export class EmployeeBasicDto {
  @ApiProperty({
    example: 'user-uuid-123',
    description: 'Unique identifier of the employee',
  })
  id: string;

  @ApiProperty({ example: 'John', description: 'First name of the employee' })
  first_name: string;

  @ApiProperty({ example: 'Doe', description: 'Last name of the employee' })
  last_name: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'Email address of the employee',
  })
  email: string;

  // Add other basic, non-sensitive fields if commonly returned.
  // For example, position or profile_image_url if they are part of a "basic" view.
}
