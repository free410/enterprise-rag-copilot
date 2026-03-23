# 阿里云 API 网关自建认证鉴权

- 来源站点：阿里云帮助中心
- 原始链接：https://help.aliyun.com/zh/api-gateway/configure-self-built-authentication
- 抓取时间：2026-03-23 20:38:37
- 用途：适合补充 API 网关、认证鉴权、网关配置类知识。

## 正文摘录（清洗后）

使用云原生API网关接入自建认证鉴权服务-API网关-阿里云
大模型产品解决方案权益定价云市场伙伴服务了解阿里云
查看 “
” 全部搜索结果
AI 助理
文档备案控制台
官方文档
输入文档关键字查找
产品概述
快速入门
操作指南
安全合规
实践教程
开发参考
服务支持
首页API 网关云原生API网关操作指南安全能力管理全局认证鉴权配置自建认证鉴权
配置自建认证鉴权
更新时间：
复制为 MD 格式
产品详情
我的收藏
云原生API网关支持自定义鉴权服务，方便在网关入口处完成鉴权，避免每个后端服务都接入鉴权服务。本文介绍如何为云原生API网关配置自建认证鉴权。
背景信息
服务端通常根据客户端请求携带的凭证信息（即Token）来保护对外暴露的API接口的通信安全。Token形式没有严格规定，一般根据实际业务场景决定。
如果Token采用的是JSON WEB Token (JWT)，那么在任何时间、任何地点都可以利用公钥来对Token的签名进行验签，无需访问一个中心化的鉴权服务。
如果Token的形式是业务方自定义的格式，则服务端收到请求后，必须额外访问中心化的鉴权服务来完成鉴权操作，以此保护API接口的通信安全。云原生API网关支持自定义鉴权。
下面以一个示例来说明云原生API网关接入自建的鉴权服务后的请求处理流程。
客户端向网关发起认证请求，例如登录操作。
网关将认证请求直接转发给认证服务。
认证服务读取请求中的验证信息（例如用户名、密码）进行验证，验证通过后返回凭证信息（Token）给网关，由网关响应给客户端。
客户端向网关发起业务请求，例如下单操作/order，请求中携带上一步中身份认证成功后颁发的Token。
网关通过截取原始业务请求的Path（包含Query Parameters）、HTTP方法（GET、POST等）和Token来形成一个新的请求报文，向接入的自建鉴权服务发起鉴权请求。您需要在网关控制台配置Token所在的HTTP Header，另外您可以根据需要开启允许携带原始请求的Body。
假设自建鉴权服务的鉴权API是/validateToken，那么鉴权请求的真实Path是鉴权API加上原始业务请求的Path后的结果，即/validateToken/order。
鉴权服务收到鉴权请求后，既可以根据Token完成校验Token合法性的操作，又可以根据原始业务请求的Path完成鉴权操作。
如果您鉴权服务的鉴权响应可以修改HTTP状态码，那么您可以利用HTTP状态码来反映鉴权结果。
鉴权服务返回HTTP状态码为200，表明Token合法且Token有权限访问该后端资源。网关继续将原始业务请求转发给受保护的后端服务，收到业务响应后再次转发给客户端，完成下单操作。
鉴权服务返回HTTP状态码为401或者403，表明Token不合法或Token无权限访问该后端资源。网关直接返回鉴权服务的响应给客户端，此次下单操作失败。
如果您的鉴权服务受业务本身限制要求鉴权响应的HTTP状态码统一为200，那么您可以利用内置的HTTP头部
x-mse-external-authz-check-result
鉴权服务的响应头部
x-mse-external-authz-check-result
的结果为
true
，表明Token合法或Token有权限访问该后端资源。网关继续将原始业务请求转发给受保护的后端服务，收到业务响应后再次转发给客户端，完成下单操作。
鉴权服务的响应头部
x-mse-external-authz-check-result
的结果为
false
，表明Token不合法或Token无权限访问该后端资源。网关直接返回鉴权服务的响应给客户端，此次下单操作失败。
创建自建认证鉴权
登录云原生API网关控制台。
在左侧导航栏，选择实例，并在顶部菜单栏选择地域。
在实例页面，单击目标网关实例名称。
在左侧导航栏，单击安全管理 > 全局认证鉴权。
在全局认证鉴权页面，单击创建鉴权，然后在创建鉴权面板，配置网关鉴权相关参数，最后单击确定。
配置项
说明
开启
是否开启云原生API网关鉴权。
鉴权名称
自定义云原生API网关鉴权的名称。
鉴权类型
选择自建的鉴权服务。
鉴权服务
选择鉴权的后端服务，可以在服务管理中添加。相关内容，请参见添加服务。
说明
仅支持选择HTTP协议的服务，不支持Dubbo等其他协议的服务。
如果具有多个端口的K8s Service，则默认取第一个端口。如果您希望使用其他端口，需要在容器服务中创建一个额外的K8s Service且只使用目标端口。
鉴权API
设置鉴权服务提供的鉴权API的Path，API的Path需是前缀匹配。
例如，您的鉴权服务基于SpringMVC构建，对外开放的鉴权API为/check，那么处理/check/**的请求设置如下：
@RequestMapping("/check/**")
public ResponseEntity<RestResult<String>> check(){}
Token位置
设置Token在请求报文中的Header位置，常见的有Authorization和Cookie。您可以选择下拉选择或手动输入的方式设置Token位置。
鉴权请求中允许携带的头部
如果需要额外携带客户端请求中的头部，那么需要在字段中按需配置头部。
说明
Host、Method、Path和Content-Length头部会被默认添加，您无需手动添加。
鉴权响应中允许保留的头部
如果需要将鉴权响应中的头部添加到客户端请求中，那么需要在字段中按需配置头部。
说明
如果客户端请求中已经有该头部，那么其值将会被覆盖。
鉴权请求中允许携带Body
勾选鉴权请求中允许携带Body后，鉴权请求会包含原始请求的Body。
其中，Body最大字节数表示允许鉴权请求携带Body的最大字节数。单位：字节。
超时时间
设置等待鉴权服务返回结果的最大等待时间。单位：秒，默认超时时间为10秒。
模式
支持宽松模式和严格模式，建议您使用宽松模式。
宽松模式：当鉴权服务不可用时（鉴权服务建立连接失败或者返回5xx请求），网关接受客户端请求。
严格模式：当鉴权服务不可用时（鉴权服务建立连接失败或者返回5xx请求），网关拒绝客户端请求。
简单条件
在授权右侧单击简单条件。简单条件授权模式支持白名单模式和黑名单模式。
白名单模式：白名单中的Hosts和Paths无需校验即可访问，其余Hosts和Paths都需要校验。
黑名单模式：黑名单中的Hosts和Paths需要校验，其余Hosts和Paths可直接访问。
单击+ 规则条件，设置请求域名、路径和请求头。
域名：请求访问的域名，即Hosts。
路径（Path）：请求访问的接口Path，即Paths。
路径匹配条件：Path支持精确匹配、前缀匹配和正则匹配。
精确匹配：输入完整的Path，例如/app/v1/order。
前缀匹配：输入Path的前缀，并且末尾填一个*。例如，匹配所有以/app开头的请求，那么需设置为/app/*。
正则匹配：正则匹配的语法遵循Google Re2规范。详细信息，请参见Re2语法。
大小写敏感：若选中此项，路径匹配值会区分大小写。
请求头（Header）：请求访问的头部信息，即Header。单击+请求头配置，可以配置多个Header，各个Header之间是与的关系。
HeaderKey：Header字段名。
条件：Header支持的匹配条件。
等于：请求Header集合中指定Key的值与输入值相等。
不等于：请求Header集合中指定Key的值与输入值不相等。
存在：请求Header集合中存在输入Key值。
不存在：请求Header集合中不存在输入Key值。
包含：请求Header集合中指定Key的值包含输入值。
不包含：请求Header集合中指定Key的值不包含输入值。
前缀：请求Header集合中指定Key的值以输入值为前缀。
后缀：请求Header集合中指定Key的值以输入值为后缀。
正则：请求Header集合中指定Key的值匹配输入的正则表达式，正则匹配的语法遵循Google Re2规范。详细信息，请参见Re2语法。
值：Header字段的取值。
复杂条件
在授权右侧单击复杂条件。
复杂条件授权支持通过YAML配置Envoy的permission数据结构来配置基于与/或/非组合条件逻辑的授权规则。当满足配置的条件时执行鉴权逻辑；不满足条件的请求无需鉴权即可访问。
说明
完整的permission数据结构字段说明，请参见Envoy官方文档。
配置示例请参见复杂条件授权示例。
返回全局认证鉴权页面查看鉴权信息，如果已包含新建的网关鉴权信息，说明网关自建认证鉴权新建成功。
查看并管理鉴权服务
登录云原生API网关控制台。
在左侧导航栏，选择实例，并在顶部菜单栏选择地域。
在实例页面，单击目标网关实例名称。
在左侧导航栏，单击安全管理 > 全局认证鉴权。
在认证鉴权页面，单击目标鉴权规则操作列的详情，可查看当前服务的基本信息和认证配置，也可查看并管理授权信息。
您可在授权信息区域，单击创建授权信息。在对话框中输入请求域名和请求Path，并选择匹配方式，然后单击确定新增授权规则。
相关操作
您还可以执行以下其他操作，管理网关的认证鉴权：
开启鉴权：在全局认证鉴权页面，单击目标鉴权规则操作列的开启，使认证鉴权信息生效。
关闭鉴权：在全局认证鉴权页面，单击目标鉴权规则操作列的关闭，关闭网关认证鉴权信息。
编辑鉴权：在全局认证鉴权页面，单击目标鉴权规则操作列的编辑，可编辑网关认证鉴权信息。
删除鉴权：在全局认证鉴权页面，单击目标鉴权规则操作列的删除，可删除网关认证鉴权信息。
说明
只有在认证鉴权信息关闭的状态下才可执行删除操作。
复杂条件授权示例
正则匹配域名示例
本示例中，只对exampleA.com和exampleB.com两个域名下前缀匹配路径的请求执行鉴权逻辑。注意此处regex字段配置的正则需要完全匹配，而非部分匹配。
本示例中，test.exampleA.com将无法命中条件，无需鉴权即可访问。
说明
正则匹配的语法遵循Google Re2规范。详细信息，请参见Re2语法。
完整的permission数据结构字段说明，请参见Envoy官方文档。
permissions:
# and_rules 表示下面的所有 rules 条件同时成立时执行鉴权
- and_rules:
rules:
- url_path:
# 前缀匹配路径
path:
prefix: /
- header:
# 正则匹配
safe_regex_match:
regex: "(exampleA\\.com|exampleB\\.com)"
# 支持HTTP Pseudo-Header规范，可通过":authority"这个Header来获取域名
name: ":authority"
与/或/非多条件组合示例
本示例满足以下条件：
exampleA.com/api前缀开头的请求需要鉴权，但是：
exampleA.com/api/appa/bbb不需要鉴权。
exampleA.com/api/appb/ccc不需要鉴权。
exampleB.com下所有请求需要鉴权，但是：
exampleB.com/api/appa/bbb不需要鉴权。
exampleB.com/api/appb/ccc不需要鉴权。
exampleB.com/api/appc前缀开头的不需要鉴权，但是：
exampleB.com/api/appc/bbb/ccc需要鉴权。
exampleB.com/api/appc/ccc/ddd需要鉴权。
整理逻辑如下图所示：
对应的YAML配置如下：
permissions:
# or_rules 表示下面的所有 rules 条件中，有任意一个条件成立时执行鉴权
- or_rules:
rules:
# and_rules，表示下面所有 rules 同时满足，此 rule 条件才成立
# 规则一
- and_rules:
rules:
- url_path:
path:
exact: /api/appc/bbb/ccc
- header:
exact_match: "exampleB.com"
name: ":authority"
# 规则二
- and_rules:
rules:
- url_path:
path:
exact: /api/appc/ccc/ddd
- header:
exact_match: "exampleB.com"
name: ":authority"
- and_rules:
rules:
# 规则三
- url_path:
path:
prefix: /api/
# not_rule 表示下面的配置不满足时，此 rule 条件才成立
# 规则四
- not_rule:
url_path:
path:
exact: /api/appa/bbb
# 规则五
- not_rule:
url_path:
path:
exact: /api/appb/ccc
- header:
exact_match: "exampleA.com"
name: ":authority"
- and_rules:
rules:
# 规则六
- url_path:
path:
prefix: /
# not_rule 表示下面的配置不满足时，此 rule 条件才成立
# 规则七
- not_rule:
url_path:
path:
exact: /api/appa/bbb
# 规则八
- not_rule:
url_path:
path:
exact: /api/appb/ccc
# 规则九
- not_rule:
url_path:
path:
prefix: /api/appc/
- header:
exact_match: "exampleB.com"
name: ":authority"
上一篇：配置OIDC认证鉴权下一篇：事件管理
该文章对您有帮助吗？
反馈
为什么选择阿里云
什么是云计算全球基础设施技术领先稳定可靠安全合规分析师报告
大模型
通义大模型大模型服务AI应用构建
产品和定价
全部产品免费试用产品动态产品定价配置报价器云上成本管理
技术内容
技术解决方案帮助文档开发者社区天池大赛阿里云认证
权益
免费试用解决方案免费试用高校计划5亿算力补贴推荐返现计划
服务
基础服务企业增值服务迁云服务官网公告健康看板信任中心
关注阿里云
关注阿里云公众号或下载阿里云APP，关注云资讯，随时随地运维管控云服务
联系我们：4008013260
法律声明Cookies政策廉正举报安全举报联系我们加入我们
友情链接
阿里巴巴集团淘宝网天猫全球速卖通阿里巴巴国际交易市场1688阿里妈妈飞猪阿里云计算万网高德UC友盟优酷钉钉支付宝达摩院淘宝海外阿里云盘淘宝闪购
© 2009-现在 Aliyun.com 版权所有 增值电信业务经营许可证： 浙B2-20080101 域名注册服务机构许可： 浙D3-20210002
浙公网安备 33010602009975号浙B2-20080101-4
