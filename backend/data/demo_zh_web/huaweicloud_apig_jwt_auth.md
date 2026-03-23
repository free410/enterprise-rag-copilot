# 华为云 API 网关 JWT 认证配置

- 来源站点：华为云文档
- 原始链接：https://support.huaweicloud.com/usermanual-apig/apig_03_0135.html
- 抓取时间：2026-03-23 20:30:55
- 用途：用于补充中国官方技术文档中的 JWT 认证、网关策略和安全配置资料。

## 正文摘录（清洗后）

配置API的JWT认证_配置API的插件策略_配置API策略_用户指南_API网关 APIG-华为云
检测到您已登录华为云国际站账号，为了您更好的体验，建议您访问国际站服务网站 https://www.huaweicloud.com/intl/zh-cn
不再显示此消息
中国站
中国站
简体中文
International
English
Bahasa Indonesia
Español
Português
Türkçe
عربي
ไทย
简体中文
日本語
Europe
English
Deutsch
Español
Français
Nederlands
华为云App
活动
产品
解决方案
定价
云商店
合作伙伴
开发者
支持与服务
了解华为云
清空最近搜索
热门搜索
云耀云服务器L实例
免费试用
云服务器
域名
云速建站
“”的所有结果
售前咨询
950808 转 1
预约咨询
售后服务
工单提交
建议反馈
我有建议
文档
备案
控制台
账号中心
费用与成本
待支付订单
待续费产品
未读消息
工单管理
管理控制台
注册登录
登录
注册
购物车
admin
账号中心
未实名认证
已实名认证
费用与成本
待支付订单0
待续费产品0
未读消息0
伙伴中心
云商店买家中心
云商店卖家中心
实时客服
工单管理
开发者空间
个性化推荐管理
管理控制台
admin退出登录
取消
清空最近搜索
热门搜索
云耀云服务器L实例
免费试用
云服务器
域名
云速建站
文档首页/API网关 APIG/用户指南/配置API策略/配置API的插件策略/配置API的JWT认证
更新时间：2025-10-27 GMT+08:00
查看PDF
分享
微博
分享文档到微博
微信
复制链接
复制链接到剪贴板
链接复制成功！
配置API的JWT认证
JWT（JSON Web Token）是一种轻量级的认证信息格式，广泛应用于API身份验证场景。您可以为API绑定JWT认证策略，利用私钥签发Token并附加在请求中，网关会使用公钥对Token进行鉴权，从而实现API的安全访问控制。API网关支持两种JWKS（JSON Web Key Set）公钥设置方式：
在策略中配置远程服务地址，网关会定时访问该地址来获取公钥。
在策略中填入固定的公钥。
如果此策略在当前实例中不支持，可提交工单升级实例到最新版本。
约束与限制
同一个环境中，一个API只能被一个JWT认证策略绑定，但一个JWT认证策略可以绑定多个API。
同一个APIG实例内最多可创建5个JWT认证策略。如需调整配额，请提交工单，申请修改。
用户需要通过工具或平台自行生成公私密钥对，在JWT认证策略中配置公钥，并使用对应的私钥生成Token。请妥善保管私钥避免泄露。
请求中携带的Token应当符合RFC 7519规范；JWT认证策略配置的公钥应当是符合RFC 7517规范的JSON格式字符串。
由于JWT并不会对数据进行加密，请勿将敏感数据设置在Token中。此外为了避免Token泄露，建议您不要对请求协议为HTTP的API使用JWT认证。
Token校验支持的加密算法包含RS256、RS384 、RS512、ES256、ES384和ES512。使用RSA算法时，建议密钥长度大于等于3072位。
JWKS_URI返回的公钥和固定设置的公钥大小，支持最大为50KB。
网关会校验Token中的nbf（生效时间）和exp（过期时间）字段，如果校验失败会拒绝请求。
当选择“定时拉取”的公钥设置方式时，必须保证JWKS_URI和APIG实例网络互通。网关内部的定时任务会每隔5min请求JWKS_URI，将返回的响应体作为公钥，并且当次请求的结果会覆盖上次请求的结果。如果要实现公私钥轮转，建议在每次轮换时，留出一段宽限时间，令JWKS_URI返回新公钥和本次轮转被替换的旧公钥，使得新旧私钥签发的Token在这段时间均有效。
网关会根据Token和JWKS公钥中的kid进行匹配验签。如果JWKS中只存在一个JWK则kid可以为空，否则不可以为空；JWKS中任意两个JWK的kid不可以相同。如果未设置kid，则公私钥替换后，之前签发的Token无法校验通过。
策略和API本身相互独立，只有为API绑定策略后，策略才对API生效。为API绑定策略时需指定发布环境，策略只对指定环境上的API生效。
策略的绑定、解绑、更新会实时生效，不需要重新发布API。
API的下线操作不影响策略的绑定关系，再次发布后仍然会带有下线前绑定的策略。
如果策略与API有绑定关系，则策略无法执行删除操作。
创建JWT认证策略
进入API网关控制台页面。
根据实际业务在左侧导航栏上方选择实例。
在左侧导航栏选择“API管理 > API策略”。
在“策略管理”页面，单击“创建策略”。
在“选择策略类型”弹窗中，选择“插件策略 > JWT认证”。
在“创建策略”弹窗中，根据下表参数说明，配置策略信息。
表1 JWT认证参数说明
参数
说明
策略名称
填写策略的名称，根据业务规划自定义。建议您按照一定的命名规则填写策略名称，方便您快速识别和查找。
策略类型
固定为“JWT认证”。
描述
填写策略的描述信息。长度为1-255个字符。
策略内容
策略的配置内容，支持表单配置和脚本配置两种方式。
设置方式
获取公钥的方式。
定时拉取：网关会每隔5min请求JWKS_URI获取公钥。
固定设置：网关会将所填入的JWKS值作为公钥。
JWKS_URI
仅当选择“定时拉取”方式时需配置。
响应返回JWKS公钥的URI地址，公钥需为遵循RFC 7517规范的JSON字符串，需保证JWKS_URI和APIG实例网络互通。网关内部的定时任务会每隔5min请求JWKS_URI，将返回的响应体作为公钥，并且当次请求的结果会覆盖上次请求的结果。
网关请求URI地址的方法为GET，如果未指定请求协议，则使用HTTPS。返回的JWKS大小最大支持50KB。
JWKS
仅当选择“固定设置”方式时需配置。
验证Token的JWKS公钥，需为遵循RFC 7517规范的json字符串。最大支持50KB。
超时时间
仅当选择“定时拉取”方式时需配置。
网关请求JWKS服务的超时时间（1-60000ms），单位为毫秒。
缓存时间
仅当选择“定时拉取”方式时需配置。
网关会将JWKS服务返回的JWKS进行缓存，允许您自定义缓存时间（600-86400s），单位为秒。
自定义host头域
仅当选择“定时拉取”方式时需配置。
请求JWKS服务前，允许您自定义请求的host头域，默认将使用请求中原始的host头域。
Token位置
Token参数的位置：header，query，cookie。
Token名称
设置Token参数名称。
当Token位置为header时默认值为Authorization，该参数不区分大小写。
当Token位置为query时默认值为access_token。
当Token位置为cookie时该参数必填，该参数不区分大小写。
Token前缀
仅当Token位置选择“header”时需配置。
Token字符串将去除该前缀，再用于鉴权。默认值为Bearer。
Token过期时钟偏移量
若token在payload中设置了过期时间（exp），网关会对其进行校验，允许您自定义校验token是否过期的时钟偏移量（0-86400s）。
Token透传至后端
是否允许将原始token透传至后端。默认值为false。
Token不存在时跳过验证
当请求未携带Token时，是否允许跳过JWT认证直接访问后端。
忽略超期时间校验
是否允许网关忽略对Token的超期时间exp字段值的校验。默认值为false。
Payload传递至后端
是否允许将Token解析出的payload传递至后端。默认值为false。
Payload所在请求头名称
仅当“Payload传递至后端”开启时需配置。
将Token解析出的Payload写入到指定名称的请求头。该参数不区分大小写。
传递字段值至后端
网关将Payload中指定字段（claim）的值，设置到指定名称的请求头中，传递至后端。您可以通过设is_override来控制是否对同名的请求头进行重写。
当is_override为true时，如果存在同名的请求头会将其值覆盖。
当is_override为false时，会额外追加同名的请求头。
is_override默认为true，最多支持设置16个字段值传递至后端。
黑名单配置
网关将根据黑名单配置，对payload中指定字段的值执行黑名单校验。如果payload中claim对应键值对匹配了黑名单配置中任意一条规则，即claim的值和某条规则中填入的字段值相等，则会拒绝请求。
脚本配置示例
"jwks_service": {
"uri": "https://example.com",
"timeout": 5000,
"ttl": 7200,
"custom_host": "xxx.xxx"
},
"jwks": "{\"keys\":[{\"kty\": \"EC\",\"crv\": \"P-256\",\"x\": \"MKBCTNIcKUSDii11ySs3526iDZ8AiTo7Tu6KPAqv7D4\",\"y\": \"4Etl6SRW2YiLUrN5vfvVHuhp7x8PxltmWWlbbM4IFyM\",\"use\": \"enc\",\"kid\": \"1\"}] }",
"token_location": "header",
"token_name": "Authorization",
"token_prefix": "Bearer",
"token_expiration_tolerance": 0,
"token_pass_through_enabled": true,
"missing_token_skip_auth_enabled": false,
"ignore_expiration_validation_enabled": false,
"claims_to_headers": [
"claim": "iat",
"header": "iat_value",
"is_override": true
},
"claim": "sub",
"header": "sub_value",
"is_override": false
],
"blacklist": [
"claim": "iat",
"value": ""
},
"claim": "sub",
"value": "test"
父主题：配置API的插件策略
上一篇：配置API的OIDC认证
下一篇：配置凭据策略
相关文档
意见反馈
文档内容是否对您有帮助？
有帮助没帮助
提供反馈
提交成功！非常感谢您的反馈，我们会继续努力做到更好！
您可在我的云声建议查看反馈及问题处理状态。
系统繁忙，请稍后重试
在使用文档中是否遇到以下问题
内容与产品页面不一致
内容不易理解
缺失示例代码
步骤不可操作
搜不到想要的内容
缺少最佳实践
意见反馈（选填）
0/500
请至少选择一项反馈信息并填写问题反馈
字符长度不能超过500
直接提交取消
如您有其它疑问，您也可以通过华为云社区问答频道来与我们联系探讨
盘古Doer提问云社区提问
7*24
多渠道服务支持
备案
提供免费备案服务
专业服务
云业务全流程支持
退订
享无忧退订服务
建议反馈
优化改进建议
热门产品
云服务器
Flexus云服务
大模型即服务平台 MaaS
华为云App
售前咨询热线
950808转1
技术服务咨询
售前咨询
sales@huaweicloud.com
备案服务
beian@huaweicloud.com
云商店咨询
partner@huaweicloud.com
下载华为云App
关注我们
关注华为云
4000 955 988
950808
华为云微信
扫描二维码
华为云微信小程序
华为云微信小程序
华为云微博
扫描二维码
华为云App
扫描下载华为云App
售前咨询：950808转1
法律声明
隐私政策
关于华为云了解华为云客户案例信任中心法律协议新闻报道视频中心热门产品 华为云码道（CodeArts） 华为云魔坊（ModelArts）MaaS模型即服务AgentArts智能体开发平台弹性云服务器 ECS云数据库 RDS for MySQL支持与服务自助服务服务公告支持计划联系我们举报中心实用工具开发工具AI助手云服务健康看板友情链接华为云伙伴作战营华为官网华为消费者业务华为开发者联盟华为企业业务华为商城
法律声明
隐私政策
©2026 Huaweicloud.com 版权所有黔ICP备20004760号-14苏B2-20130048号A2.B1.B2-20070312
增值电信业务经营许可证：B1.B2-20200593 | 域名注册服务机构许可：黔D3-20230001 | 代理域名注册服务机构：新网、西数
电子营业执照贵公网安备 52990002000093号
