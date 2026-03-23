# 腾讯云 文本内容安全 API 接入指引

- 来源站点：腾讯云文档
- 原始链接：https://cloud.tencent.com/document/product/1124/100982
- 抓取时间：2026-03-23 20:30:54
- 用途：用于补充中国官方技术文档中的 API 接入、签名和参数说明资料。

## 正文摘录（清洗后）

文本内容安全 API 接入指引_腾讯云
腾讯云
最新活动HOT
产品
解决方案
定价
企业中心
云市场
开发者
客户支持
合作与生态
了解腾讯云
关闭
搜索
文本内容安全
文档中心
入门中心
API 中心
SDK 中心
文档活动
我的反馈
文档反馈官招募中，报名立赚积分兑换代金券！>HOT
文档中心>文本内容安全>实践教程>接入指引>API 接入指引
API 接入指引
最近更新时间：2025-08-01 14:19:11
微信扫一扫
QQ
新浪微博
复制链接
链接复制成功
我的收藏
本页目录：
API文档
公共参数
签名方法
示例代码
签名失败
腾讯云 API 会对每个请求进行身份验证，用户使用原生API接入需要使用安全凭证，经过特定的步骤对请求进行签名（Signature），每个请求都需要在公共参数中指定该签名结果并以指定的方式和格式发送请求，以下内容主要介绍 API 接口文档参数以及V3签名方法。
API文档
参考 文本内容安全 接口文档，了解请求API所需要的公共参数、域名、接口输入输出参数值。
公共参数
公共参数是用于标识用户和接口签名的参数，API接口文档上不会展示公共参数说明，但每次请求API均需要携带这些参数，才能正常发起请求。
签名方法
腾讯云支持V1、V3两种签名方式，推荐使用V3签名方法计算签名，签名方法 v3 （有时也称作 TC3-HMAC-SHA256）相比签名方法 v1更安全，支持更大的请求包，支持 POST JSON 格式，性能有一定提升。首次接触，建议使用 API Explorer 中的“签名串生成”功能，选择签名版本为“API 3.0 签名 v3”，可以生成签名过程进行验证。
使用签名方法 v3 时，公共参数需要统一放到 HTTP Header 请求头部中，如下表所示：
参数名称
类型
必选
描述
Action
String
HTTP 请求头：X-TC-Action。操作的接口名称，该字段取值为 TextModeration。
Region
String
HTTP 请求头：X-TC-Region。地域参数，用来标识希望操作哪个地域的数据。取值参考接口文档中输入参数章节关于公共参数 Region 的说明。
注意：某些接口不需要传递该参数，接口文档中会对此特别说明，此时即使传递该参数也不会生效。
Timestamp
Integer
HTTP 请求头：X-TC-Timestamp。当前 UNIX 时间戳，可记录发起 API 请求的时间。例如 1529223702。
注意：如果与服务器时间相差超过5分钟，会引起签名过期错误。
Version
String
HTTP 请求头：X-TC-Version。操作的 API 的版本。取值参考接口文档中入参公共参数 Version 的说明。该字段取值为2020-12-29。
Authorization
String
HTTP 标准身份认证头部字段，例如：
TC3-HMAC-SHA256
Credential
=AKID****/Date/service/tc3_request,
SignedHeaders
=content-type
;host, Signature=fe5f80f77d5fa3beca038a248ff027d0445342fe2855ddc963176630326f1024
其中，
TC3-HMAC-SHA256：签名方法，目前固定取该值。
Credential：签名凭证，AKID**** 是 SecretId；Date 是 UTC 标准时间的日期，取值需要和公共参数 X-TC-Timestamp 换算的 UTC 标准时间日期一致；service 为具体产品名，通常为域名前缀，例如域名 cvm.tencentcloudapi.com 意味着产品名是 cvm。本产品取值为 tms；tc3_request 为固定字符串。
SignedHeaders：参与签名计算的头部信息，content-type 和 host 为必选头部。
Signature：签名摘要，计算过程请参见 签名版本 v3 签名过程。
Token
String
HTTP 请求头：X-TC-Token。即 安全凭证服务 所颁发的临时安全凭证中的 Token，使用时需要将 SecretId 和 SecretKey 的值替换为临时安全凭证中的 TmpSecretId 和 TmpSecretKey。使用长期密钥时不能设置此 Token 字段。
Language
String
HTTP 请求头：X-TC-Language。指定接口返回的语言，仅部分接口支持此参数。
取值：zh-CN，en-US。zh-CN 返回中文，en-US 返回英文。
云 API 支持 GET 和 POST 请求。
对于 GET 方法，只支持
Content-Type: application/x-www-form-urlencoded
协议格式。
对于 POST 方法，目前支持
Content-Type: application/json
协议格式。
推荐使用 POST 请求，因为两者的结果并无差异，但 GET 请求只支持 32 KB 以内的请求包，POST请求支持10MB以内的请求包，签名过程详见文档。
示例代码
以下提供 Java、Go、Python 示例 demo，填写密钥信息、接口入参即可调用。其他语言请参考签名方法 V3-签名演示，签名演示是云服务器服务作为示例，实际调用时需要根据 API 接口文档填写参数。
Java
Go
Python
PHP
importjava.nio.charset.Charset;
importjava.io.OutputStream;
importjava.io.BufferedReader;
importjava.io.InputStreamReader;
importjava.net.HttpURLConnection;
importjava.net.URL;
importjava.nio.charset.StandardCharsets;
importjava.security.MessageDigest;
importjava.text.SimpleDateFormat;
importjava.util.Date;
importjava.util.TimeZone;
importjava.util.TreeMap;
importjavax.crypto.Mac;
importjavax.crypto.spec.SecretKeySpec;
importjavax.xml.bind.DatatypeConverter;
publicclassTextModeration{
privatefinalstaticCharset UTF8 =StandardCharsets.UTF_8;
privatefinalstaticString SECRET_ID ="";
privatefinalstaticString SECRET_KEY ="";
privatefinalstaticString CT_JSON ="application/json; charset=utf-8";
publicstaticbyte[]hmac256(byte[] key,String msg)throwsException{
Mac mac =Mac.getInstance("HmacSHA256");
SecretKeySpec secretKeySpec =newSecretKeySpec(key, mac.getAlgorithm());
mac.init(secretKeySpec);
return mac.doFinal(msg.getBytes(UTF8));
publicstaticStringsha256Hex(String s)throwsException{
MessageDigest md =MessageDigest.getInstance("SHA-256");
byte[] d = md.digest(s.getBytes(UTF8));
returnDatatypeConverter.printHexBinary(d).toLowerCase();
publicstaticvoidmain(String[] args)throwsException{
String service ="tms";
String host ="tms.tencentcloudapi.com";
String region ="ap-guangzhou";
String action ="TextModeration";
String version ="2020-12-29";
String algorithm ="TC3-HMAC-SHA256";
String timestamp =String.valueOf(System.currentTimeMillis()/1000);
SimpleDateFormat sdf =newSimpleDateFormat("yyyy-MM-dd");
sdf.setTimeZone(TimeZone.getTimeZone("UTC"));
String date = sdf.format(newDate(Long.valueOf(timestamp +"000")));
String httpRequestMethod ="POST";
String canonicalUri ="/";
String canonicalQueryString ="";
String canonicalHeaders ="content-type:application/json; charset=utf-8\\n"
+"host:"+ host +"\\n"+"x-tc-action:"+ action.toLowerCase()+"\\n";
String signedHeaders ="content-type;host;x-tc-action";
String payload ="{\\"Content\\": \\"xxxx\\",\\"BizType\\": \\"xxxx\\"}";// body数据为json
String hashedRequestPayload =sha256Hex(payload);
String canonicalRequest = httpRequestMethod +"\\n"+ canonicalUri +"\\n"+ canonicalQueryString +"\\n"
+ canonicalHeaders +"\\n"+ signedHeaders +"\\n"+ hashedRequestPayload;
String credentialScope = date +"/"+ service +"/"+"tc3_request";
String hashedCanonicalRequest =sha256Hex(canonicalRequest);
String stringToSign = algorithm +"\\n"+ timestamp +"\\n"+ credentialScope +"\\n"+ hashedCanonicalRequest;
byte[] secretDate =hmac256(("TC3"+ SECRET_KEY).getBytes(UTF8), date);
byte[] secretService =hmac256(secretDate, service);
byte[] secretSigning =hmac256(secretService,"tc3_request");
String signature =DatatypeConverter.printHexBinary(hmac256(secretSigning, stringToSign)).toLowerCase();
String authorization = algorithm +" "+"Credential="+ SECRET_ID +"/"+ credentialScope +", "
+"SignedHeaders="+ signedHeaders +", "+"Signature="+ signature;
try{
URL url =newURL("https://"+ host);
HttpURLConnection connection =(HttpURLConnection) url.openConnection();
connection.setRequestMethod("POST");
connection.setRequestProperty("Authorization", authorization);
connection.setRequestProperty("Content-Type", CT_JSON);
connection.setRequestProperty("Host", host);
connection.setRequestProperty("X-TC-Action", action);
connection.setRequestProperty("X-TC-Timestamp", timestamp);
connection.setRequestProperty("X-TC-Version", version);
connection.setRequestProperty("X-TC-Region", region);
// Enable input/output streams and write the payload
connection.setDoOutput(true);
OutputStream os = connection.getOutputStream();
os.write(payload.getBytes(UTF8));
os.flush();
os.close();
// Get the response
int responseCode = connection.getResponseCode();
if(responseCode ==200){
BufferedReader in =newBufferedReader(newInputStreamReader(connection.getInputStream()));
String inputLine;
StringBuilder response =newStringBuilder();
while((inputLine = in.readLine())!=null){
response.append(inputLine);
in.close();
// Process the response as needed
System.out.println("Response: "+ response.toString());
}else{
// Handle the error response
System.out.println("Error Response Code: "+ responseCode);
connection.disconnect();
}catch(Exception e){
e.printStackTrace();
package tms
import(
"crypto/hmac"
"crypto/sha256"
"encoding/base64"
"encoding/hex"
"encoding/json"
"fmt"
"io/ioutil"
"net/http"
"strconv"
"strings"
"time"
type textmods struct{
Content string
funcsha256hexs(s string)string{
b := sha256.Sum256([]byte(s))
return hex.EncodeToString(b[:])
funchmacsha256s(s, key string)string{
hashed := hmac.New(sha256.New,[]byte(key))
hashed.Write([]byte(s))
returnstring(hashed.Sum(nil))
funcDetectTextSingles(){
secretId :=""// 密钥ID
secretKey :=""// 密钥Key
host :="tms.tencentcloudapi.com"// 接口域名
algorithm :="TC3-HMAC-SHA256"
service :="tms"
version :="2020-12-29"// 版本为固定值
action :="TextModeration"
region :="ap-guangzhou"// 地域
var timestamp int64= time.Now().Unix()
// step 1: build canonical request string
httpRequestMethod :="POST"
canonicalURI :="/"
canonicalQueryString :=""
canonicalHeaders :="content-type:application/json; charset=utf-8\\n"+"host:"+ host +"\\n"
signedHeaders :="content-type;host"
var a = textmods{
Content: base64.StdEncoding.EncodeToString([]byte("测试文本内容")),// 接口入参
b, err := json.Marshal(a)
if err !=nil{
fmt.Print(err.Error())
return
payload :=string(b)
hashedRequestPayload :=sha256hexs(payload)
canonicalRequest := fmt.Sprintf("%s\\n%s\\n%s\\n%s\\n%s\\n%s",
httpRequestMethod,
canonicalURI,
canonicalQueryString,
canonicalHeaders,
signedHeaders,
hashedRequestPayload)
// fmt.Println(canonicalRequest)
// step 2: build string to sign
date := time.Unix(timestamp,0).UTC().Format("2006-01-02")
credentialScope := fmt.Sprintf("%s/%s/tc3_request", date, service)
hashedCanonicalRequest :=sha256hexs(canonicalRequest)
string2sign := fmt.Sprintf("%s\\n%d\\n%s\\n%s",
algorithm,
timestamp,
credentialScope,
hashedCanonicalRequest)
// fmt.Println(string2sign)
// step 3: sign string
secretDate :=hmacsha256s(date,"TC3"+secretKey)
secretService :=hmacsha256s(service, secretDate)
secretSigning :=hmacsha256s("tc3_request", secretService)
signature := hex.EncodeToString([]byte(hmacsha256s(string2sign, secretSigning)))
// fmt.Println(signature)
// step 4: build authorization
authorization := fmt.Sprintf("%s Credential=%s/%s, SignedHeaders=%s, Signature=%s",
algorithm,
secretId,
credentialScope,
signedHeaders,
signature)
req,_:= http.NewRequest("POST","https://"+host, strings.NewReader(payload))
req.Header.Set("Authorization", authorization)
req.Header.Set("Content-Type","application/json; charset=utf-8")
req.Header.Set("Host", host)
req.Header.Set("X-TC-Action", action)
req.Header.Set("X-TC-Timestamp", strconv.FormatInt(timestamp,10))
req.Header.Set("X-TC-Version", version)
req.Header.Set("X-TC-Region", region)
resp, err :=(&http.Client{}).Do(req)
if err !=nil{
fmt.Print(err.Error())
return
defer resp.Body.Close()
respByte,_:= ioutil.ReadAll(resp.Body)
fmt.Println(string(respByte))
#!/usr/bin/env python3
# -*- coding:utf-8 -*-
import hashlib
import hmac
import json
import base64
import time
from datetime import datetime
import requests
secret_id =""# 密钥ID
secret_key =""# 密钥Key
service ="tms"
host ="tms.tencentcloudapi.com"# 接口域名
endpoint ="https://"+ host
region ="ap-guangzhou"# 地域
version ="2020-12-29"# 版本为固定值
algorithm ="TC3-HMAC-SHA256"
defdo_action(action, params):
timestamp =int(time.time())
day = datetime.utcfromtimestamp(timestamp).strftime("%Y-%m-%d")
# ************* 步骤 1：拼接规范请求串 *************
http_request_method ="POST"
canonical_url ="/"
canonical_querystring =""
ct ="application/json; charset=utf-8"
payload = json.dumps(params)
canonical_headers ="content-type:%s\\nhost:%s\\n"%(ct, host)
signed_headers ="content-type;host"
hashed_request_payload = hashlib.sha256(payload.encode("utf-8")).hexdigest()
canonical_request =(
http_request_method
+"\\n"
+ canonical_url
+"\\n"
+ canonical_querystring
+"\\n"
+ canonical_headers
+"\\n"
+ signed_headers
+"\\n"
+ hashed_request_payload
# print(canonical_request)
# ************* 步骤 2：拼接待签名字符串 *************
credential_scope = day +"/"+ service +"/"+"tc3_request"
hashed_canonical_request = hashlib.sha256(
canonical_request.encode("utf-8")
).hexdigest()
string_to_sign =(
algorithm
+"\\n"
+str(timestamp)
+"\\n"
+ credential_scope
+"\\n"
+ hashed_canonical_request
# print(string_to_sign)
secret_date = sign(("TC3"+ secret_key).encode("utf-8"), day)
secret_service = sign(secret_date, service)
secret_signing = sign(secret_service,"tc3_request")
signature = hmac.new(
secret_signing, string_to_sign.encode("utf-8"), hashlib.sha256
).hexdigest()
# print(signature)
# ************* 步骤 4：拼接 Authorization *************
authorization =(
algorithm
+" "
+"Credential="
+ secret_id
+"/"
+ credential_scope
+", "
+"SignedHeaders="
+ signed_headers
+", "
+"Signature="
+ signature
# print(authorization)
headers ={
"Authorization": authorization,
"Content-Type":"application/json; charset=utf-8",
"Host": host,
"X-TC-Action": action,
"X-TC-Timestamp":str(timestamp),
"X-TC-Version": version,
"X-TC-Region": region,
# 发送请求
resp = requests.post(url=endpoint, data=payload, headers=headers)
return resp
# 计算签名摘要函数
defsign(key, msg):
return hmac.new(key, msg.encode("utf-8"), hashlib.sha256).digest()
defimage_detect(params):
action ="TextModeration"
resp = do_action(action, params)
return resp.text
if __name__ =="__main__":
params =[]
content =""# 接口参数
b4content = base64.b64encode(content.encode()).decode()
params ={"BizType":"default","Content": b4content}
resp = image_detect(params)
print(resp)
<?php
//简单的后端demo
// 接口入参
$Content='';
$BizType='';
$time=time();
$Nonce=rand();
$Action='TextModeration';// 接口名称
$Version='2020-12-29';
$Region='ap
