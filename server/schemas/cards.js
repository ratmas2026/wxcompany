const { z } = require('zod')

const cardCreateSchema = z.object({
  name: z.string().min(2, '姓名至少2个字符').max(50, '姓名最多50个字符'),
  phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确'),
  title: z.string().max(100).optional().default(''),
  department: z.string().max(100).optional().default(''),
  company: z.string().max(200).optional().default(''),
  email: z.string().email('邮箱格式不正确').optional().or(z.literal('')).default(''),
  address: z.string().max(500).optional().default(''),
  avatar: z.string().max(2000).optional().default(''),
  bio: z.string().max(2000).optional().default(''),
  status: z.boolean().optional().default(true),
  template: z.string().max(100).optional().default('')
}).strict()

module.exports = { cardCreateSchema }
