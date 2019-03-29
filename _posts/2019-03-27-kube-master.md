---
layout: post
title: "3.k8s部署-Master组件安装"
date: 2019-03-27 00:55:58
image: '/assets/img/'
description: 'k8s部署第三步-Master组件安装'
tags:
- kubernetes
- master
categories:
- kubernetes
twitter_text: 'k8s部署第三步-Master组件安装'
---
> 每日一句: Real integrity is doing the right thing, knowing that nobody’s going to know whether you did it or not.

#### [Part 1: kube-apiserver](#part1)

#### [Part 2: kube-controller-manager](#part2)

#### [Part 3: kube-scheduler](#part3)

#### [kubernetes二进制部署系列](#serial)

安装顺序：**配置文件 -> systemd管理组件 -> 启动**

二进制部署 kubernets 下载

[https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG-1.14.md#server-binaries](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG-1.14.md#server-binaries)

我们只需要下载 **Server Binaries **就可以了

我们来书写下半自动化脚本 `vi apiserver.sh`

```bash
#!/bin/bash

MASTER_ADDRESS=$1
ETCD_SERVERS=$2

cat <<EOF >/opt/kubernetes/cfg/kube-apiserver

KUBE_APISERVER_OPTS="--logtostderr=false \\
--log-dir=/opt/kubernetes/logs \\
--v=4 \\
--etcd-servers=${ETCD_SERVERS} \\
--bind-address=${MASTER_ADDRESS} \\
--secure-port=6443 \\
--advertise-address=${MASTER_ADDRESS} \\
--allow-privileged=true \\
--service-cluster-ip-range=10.0.0.0/24 \\
--enable-admission-plugins=NamespaceLifecycle,LimitRanger,ServiceAccount,ResourceQuota,NodeRestriction \\
--authorization-mode=RBAC,Node \\
--kubelet-https=true \\
--enable-bootstrap-token-auth \\
--token-auth-file=/opt/kubernetes/cfg/token.csv \\
--service-node-port-range=30000-50000 \\
--tls-cert-file=/opt/kubernetes/ssl/server.pem  \\
--tls-private-key-file=/opt/kubernetes/ssl/server-key.pem \\
--client-ca-file=/opt/kubernetes/ssl/ca.pem \\
--service-account-key-file=/opt/kubernetes/ssl/ca-key.pem \\
--etcd-cafile=/opt/etcd/ssl/ca.pem \\
--etcd-certfile=/opt/etcd/ssl/server.pem \\
--etcd-keyfile=/opt/etcd/ssl/server-key.pem"

EOF

cat <<EOF >/usr/lib/systemd/system/kube-apiserver.service
[Unit]
Description=Kubernetes API Server
Documentation=https://github.com/kubernetes/kubernetes

[Service]
EnvironmentFile=-/opt/kubernetes/cfg/kube-apiserver
ExecStart=/opt/kubernetes/bin/kube-apiserver \$KUBE_APISERVER_OPTS
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable kube-apiserver
systemctl restart kube-apiserver
```

`MASTER_ADDRESS` 是指定当前 **apiserver** 地址，哪个节点作为 **apiserver** 就指定对应的 **ip** 就可以

`ETCD_SERVERS` 与部署 **flannel** 使用的etcd地址是相同的

同样先生成 _kube-apiserver_ 配置文件和 _kube-apiserver.service _的启动文件

先在 _soft_ 目录下解压缩 kubernetes 的  **Server Binaries **文件

解压完成之后，我们进入 `cd kubernetes/server/bin/`目录下，该目录都是存放的二进制文件

我们先新建 kubernetes 的管理目录 `sudo mkdir -p /opt/kubernetes/{bin,ssl,cfg}`  

然后再拷贝我们需要的下面三个组件的启动的二进制可执行文件

```bash
sudo cp kube-apiserver kube-controller-manager kube-scheduler /opt/kubernetes/bin/
```

### <a name="part1"></a> 1. kube-apiserver

拷贝完成之后就可以启动 **apiserver** 了

```bash
sudo ./apiserver.sh 10.211.55.10 https://10.211.55.10:2379,https://10.211.55.12:2379,https://10.211.55.13:2379
```

执行之后，我们查看配置文件 `cat /opt/kubernetes/cfg/kube-apiserver`   

```bash
[k8s@k8s-master01 soft]$ cat /opt/kubernetes/cfg/kube-apiserver

KUBE_APISERVER_OPTS="--logtostderr=true \
--v=4 \
--etcd-servers=https://10.211.55.10:2379,https://10.211.55.12:2379,https://10.211.55.13:2379 \
--bind-address=10.211.55.10 \
--secure-port=6443 \
--advertise-address=10.211.55.10 \
--allow-privileged=true \
--service-cluster-ip-range=10.0.0.0/24 \
--enable-admission-plugins=NamespaceLifecycle,LimitRanger,ServiceAccount,ResourceQuota,NodeRestriction \
--authorization-mode=RBAC,Node \
--kubelet-https=true \
--enable-bootstrap-token-auth \
--token-auth-file=/opt/kubernetes/cfg/token.csv \
--service-node-port-range=30000-50000 \
--tls-cert-file=/opt/kubernetes/ssl/server.pem  \
--tls-private-key-file=/opt/kubernetes/ssl/server-key.pem \
--client-ca-file=/opt/kubernetes/ssl/ca.pem \
--service-account-key-file=/opt/kubernetes/ssl/ca-key.pem \
--etcd-cafile=/opt/etcd/ssl/ca.pem \
--etcd-certfile=/opt/etcd/ssl/server.pem \
--etcd-keyfile=/opt/etcd/ssl/server-key.pem"
```

第一个参数是`--logtostderr=true`访问日志，可以修改设定，默认为 true 是会放在 /var/log/messages

我们可以查看下 它的参数 `/opt/kubernetes/bin/kube-apiserver --help`  

可以找到设置日志目录的参数

```bash
 --log-dir string                                                                       
                If non-empty, write log files in this directory
```

也可以看下进程

```bash
[k8s@k8s-master01 soft]$ /opt/kubernetes/bin/kube-apiserver --help | grep logs
      --enable-logs-handler                       If true, install a /logs handler for the apiserver logs. (default true)
      --stderrthreshold severity         logs at or above this threshold go to stderr (default 2)
  -v, --v Level                          log level for V logs
```

我们可以修改下日志记录的地址 `sudo vi /opt/kubernetes/cfg/kube-apiserver`

```bash
KUBE_APISERVER_OPTS="--logtostderr=false \
--log-dir=/opt/kubernetes/logs \
--v=4 \
```

我们在命令行创建存放日志的目录 `sudo mkdir /opt/kubernetes/logs`

`--v=4` 表示日志级别数字越大，显示的信息就越少

`--secure-port=6443` 暴露的端口是6443

`--advertise-address=10.211.55.10`集群通告地址，集群间访问通过这个ip地址

`--allow-privileged`允许容器启用特权

`--service-cluster-ip-range` 指定负载均衡的虚拟IP

`--service-node-port-range` **service**端口范围

`enable-admission-plugins` 启用的准入插件，是决定了k8s的高级功能是否启用

`authorization-mode` 认证模式**RBAC **角色权限访问控制

`kubelet-https` 启用https

`enable-bootstrap-token-auth` Node节点加入启动token认证

`token-auth-file` token文件

`--tls-cert-file` apiserver ssl证书

下面要先完成两件事，一个是生成 apiserver 证书，一个是生成 token 文件

我们在 _k8s_ 目录下新增_ k8s-cert_ 目录，用来存放 _k8s_ 相关的证书文件

我们看下需要k8s所有需要的证书的代码 `vi k8s-cert.sh` 

```bash
cat > ca-config.json <<EOF
{
  "signing": {
    "default": {
      "expiry": "87600h"
    },
    "profiles": {
      "kubernetes": {
         "expiry": "87600h",
         "usages": [
            "signing",
            "key encipherment",
            "server auth",
            "client auth"
        ]
      }
    }
  }
}
EOF

cat > ca-csr.json <<EOF
{
    "CN": "kubernetes",
    "key": {
        "algo": "rsa",
        "size": 2048
    },
    "names": [
        {
            "C": "CN",
            "L": "Beijing",
            "ST": "Beijing",
      	    "O": "k8s",
            "OU": "System"
        }
    ]
}
EOF

cfssl gencert -initca ca-csr.json | cfssljson -bare ca -

#-----------------------

cat > server-csr.json <<EOF
{
    "CN": "kubernetes",
    "hosts": [
      "10.0.0.1",
      "127.0.0.1",
      "10.211.55.10",
			"10.211.55.11",
      "10.211.55.12",
      "10.211.55.13",
      "10.211.55.14",
      "10.211.55.15",
      "10.211.55.16",
      "10.211.55.17",
      "10.211.55.18",
      "10.211.55.19",
      "10.211.55.20",
      "kubernetes",
      "kubernetes.default",
      "kubernetes.default.svc",
      "kubernetes.default.svc.cluster",
      "kubernetes.default.svc.cluster.local"
    ],
    "key": {
        "algo": "rsa",
        "size": 2048
    },
    "names": [
        {
            "C": "CN",
            "L": "BeiJing",
            "ST": "BeiJing",
            "O": "k8s",
            "OU": "System"
        }
    ]
}
EOF

cfssl gencert -ca=ca.pem -ca-key=ca-key.pem -config=ca-config.json -profile=kubernetes server-csr.json | cfssljson -bare server

#-----------------------

cat > admin-csr.json <<EOF
{
  "CN": "admin",
  "hosts": [],
  "key": {
    "algo": "rsa",
    "size": 2048
  },
  "names": [
    {
      "C": "CN",
      "L": "BeiJing",
      "ST": "BeiJing",
      "O": "system:masters",
      "OU": "System"
    }
  ]
}
EOF

cfssl gencert -ca=ca.pem -ca-key=ca-key.pem -config=ca-config.json -profile=kubernetes admin-csr.json | cfssljson -bare admin

#-----------------------

cat > kube-proxy-csr.json <<EOF
{
  "CN": "system:kube-proxy",
  "hosts": [],
  "key": {
    "algo": "rsa",
    "size": 2048
  },
  "names": [
    {
      "C": "CN",
      "L": "BeiJing",
      "ST": "BeiJing",
      "O": "k8s",
      "OU": "System"
    }
  ]
}
EOF

cfssl gencert -ca=ca.pem -ca-key=ca-key.pem -config=ca-config.json -profile=kubernetes kube-proxy-csr.json | cfssljson -bare kube-proxy
```

在 **server-csr.json** 中最主要**host**的是**master IP**和**LoadBalancer IP**<br />**<br />直接运行` bash k8s-cert.sh ` 生成所有需要的证书

```bash
[k8s@k8s-master01 k8s]$ cd k8s-cert/
[k8s@k8s-master01 k8s-cert]$ ls
k8s-cert.sh
[k8s@k8s-master01 k8s-cert]$ bash k8s-cert.sh 
2019/03/24 14:02:27 [INFO] generating a new CA key and certificate from CSR
2019/03/24 14:02:27 [INFO] generate received request
2019/03/24 14:02:27 [INFO] received CSR
2019/03/24 14:02:27 [INFO] generating key: rsa-2048
2019/03/24 14:02:27 [INFO] encoded CSR
2019/03/24 14:02:27 [INFO] signed certificate with serial number 439168875646062768227351934451431465060221873523
2019/03/24 14:02:27 [INFO] generate received request
2019/03/24 14:02:27 [INFO] received CSR
2019/03/24 14:02:27 [INFO] generating key: rsa-2048
2019/03/24 14:02:27 [INFO] encoded CSR
2019/03/24 14:02:27 [INFO] signed certificate with serial number 571216239778279438766509324421370965629943417504
2019/03/24 14:02:27 [WARNING] This certificate lacks a "hosts" field. This makes it unsuitable for
websites. For more information see the Baseline Requirements for the Issuance and Management
of Publicly-Trusted Certificates, v.1.1.6, from the CA/Browser Forum (https://cabforum.org);
specifically, section 10.2.3 ("Information Requirements").
2019/03/24 14:02:27 [INFO] generate received request
2019/03/24 14:02:27 [INFO] received CSR
2019/03/24 14:02:27 [INFO] generating key: rsa-2048
2019/03/24 14:02:27 [INFO] encoded CSR
2019/03/24 14:02:27 [INFO] signed certificate with serial number 259635515490931899133482538422415185276383472801
2019/03/24 14:02:27 [WARNING] This certificate lacks a "hosts" field. This makes it unsuitable for
websites. For more information see the Baseline Requirements for the Issuance and Management
of Publicly-Trusted Certificates, v.1.1.6, from the CA/Browser Forum (https://cabforum.org);
specifically, section 10.2.3 ("Information Requirements").
2019/03/24 14:02:27 [INFO] generate received request
2019/03/24 14:02:27 [INFO] received CSR
2019/03/24 14:02:27 [INFO] generating key: rsa-2048
2019/03/24 14:02:28 [INFO] encoded CSR
2019/03/24 14:02:28 [INFO] signed certificate with serial number 177189617174752721957342588248553751872097183569
2019/03/24 14:02:28 [WARNING] This certificate lacks a "hosts" field. This makes it unsuitable for
websites. For more information see the Baseline Requirements for the Issuance and Management
of Publicly-Trusted Certificates, v.1.1.6, from the CA/Browser Forum (https://cabforum.org);
specifically, section 10.2.3 ("Information Requirements").
[k8s@k8s-master01 k8s-cert]$ ls
admin.csr       admin.pem       ca-csr.json  k8s-cert.sh          kube-proxy-key.pem  server-csr.json
admin-csr.json  ca-config.json  ca-key.pem   kube-proxy.csr       kube-proxy.pem      server-key.pem
admin-key.pem   ca.csr          ca.pem       kube-proxy-csr.json  server.csr          server.pem
```

我们把所需要的证书拷贝到 _/opt/kubernetes/ssl _目录下

`sudo cp ca.pem ca-key.pem server.pem server-key.pem /opt/kubernetes/ssl/`

下一步生成 **token** 文件，我们新建一个脚本文件` vi kubeconfig.sh` 

```shell
# 创建 TLS Bootstrapping Token
#BOOTSTRAP_TOKEN=$(head -c 16 /dev/urandom | od -An -t x | tr -d ' ')
BOOTSTRAP_TOKEN=0fb61c46f8991b718eb38d27b605b008

cat > token.csv <<EOF
${BOOTSTRAP_TOKEN},kubelet-bootstrap,10001,"system:kubelet-bootstrap"
EOF

#----------------------

APISERVER=$1
SSL_DIR=$2

# 创建kubelet bootstrapping kubeconfig 
export KUBE_APISERVER="https://$APISERVER:6443"

# 设置集群参数
kubectl config set-cluster kubernetes \
  --certificate-authority=$SSL_DIR/ca.pem \
  --embed-certs=true \
  --server=${KUBE_APISERVER} \
  --kubeconfig=bootstrap.kubeconfig

# 设置客户端认证参数
kubectl config set-credentials kubelet-bootstrap \
  --token=${BOOTSTRAP_TOKEN} \
  --kubeconfig=bootstrap.kubeconfig

# 设置上下文参数
kubectl config set-context default \
  --cluster=kubernetes \
  --user=kubelet-bootstrap \
  --kubeconfig=bootstrap.kubeconfig

# 设置默认上下文
kubectl config use-context default --kubeconfig=bootstrap.kubeconfig

#----------------------

# 创建kube-proxy kubeconfig文件

kubectl config set-cluster kubernetes \
  --certificate-authority=$SSL_DIR/ca.pem \
  --embed-certs=true \
  --server=${KUBE_APISERVER} \
  --kubeconfig=kube-proxy.kubeconfig

kubectl config set-credentials kube-proxy \
  --client-certificate=$SSL_DIR/kube-proxy.pem \
  --client-key=$SSL_DIR/kube-proxy-key.pem \
  --embed-certs=true \
  --kubeconfig=kube-proxy.kubeconfig

kubectl config set-context default \
  --cluster=kubernetes \
  --user=kube-proxy \
  --kubeconfig=kube-proxy.kubeconfig

kubectl config use-context default --kubeconfig=kube-proxy.kubeconfig

```

我们使用官方推荐的 **token** 生成方式，在命令行运行

`BOOTSTRAP_TOKEN=$(head -c 16 /dev/urandom | od -An -t x | tr -d ' ')`  

然后写入 _token.csv_ 文件

```bash
cat > token.csv <<EOF
${BOOTSTRAP_TOKEN},kubelet-bootstrap,10001,"system:kubelet-bootstrap"
EOF
```

然后查看`cat token.csv`是否写入成功

```bash
[k8s@k8s-master01 k8s-cert]$ BOOTSTRAP_TOKEN=$(head -c 16 /dev/urandom | od -An -t x | tr -d ' ')
[k8s@k8s-master01 k8s-cert]$ cat > token.csv <<EOF
> ${BOOTSTRAP_TOKEN},kubelet-bootstrap,10001,"system:kubelet-bootstrap"
> EOF
[k8s@k8s-master01 k8s-cert]$ cat token.csv
3172e91e77cb1a5fe47a3c957e94f5f1,kubelet-bootstrap,10001,"system:kubelet-bootstrap"
```

`3172e91e77cb1a5fe47a3c957e94f5f1`是**token** id标识身份

`kubelet-bootstrap`是用户

`10001`是用户组

`"system:kubelet-bootstrap"`加入到当前k8s的角色

所以之后的 **kubelet** 启动都会使用这个 **token** 来验证请求

这个 **token** 的权限是仅限于 **kubelet** 请求加入集群时颁发证书使用

我们把这个_ token.csv_ 文件复制到_ /opt/kubernetes/cfg/ _目录下

`sudo cp token.csv /opt/kubernetes/cfg/`

都准备好了我们就可以启动了 `sudo systemctl restart kube-apiserver` 

```bash
[k8s@k8s-master01 k8s-cert]$ ls /opt/kubernetes/ssl/                                                  
ca-key.pem  ca.pem  server-key.pem  server.pem
[k8s@k8s-master01 k8s-cert]$ sudo systemctl restart kube-apiserver
[k8s@k8s-master01 k8s-cert]$ ps -ef | grep kube
root     27579     1 99 14:45 ?        00:00:05 /opt/kubernetes/bin/kube-apiserver --logtostderr=false --log-dir=/opt/kubernetes/logs --v=4 --etcd-servers=https://10.211.55.10:2379,https://10.211.55.12:2379,https://10.211.55.13:2379 --bind-address=10.211.55.10 --secure-port=6443 --advertise-address=10.211.55.10 --allow-privileged=true --service-cluster-ip-range=10.0.0.0/24 --enable-admission-plugins=NamespaceLifecycle,LimitRanger,ServiceAccount,ResourceQuota,NodeRestriction --authorization-mode=RBAC,Node --kubelet-https=true --enable-bootstrap-token-auth --token-auth-file=/opt/kubernetes/cfg/token.csv --service-node-port-range=30000-50000 --tls-cert-file=/opt/kubernetes/ssl/server.pem --tls-private-key-file=/opt/kubernetes/ssl/server-key.pem --client-ca-file=/opt/kubernetes/ssl/ca.pem --service-account-key-file=/opt/kubernetes/ssl/ca-key.pem --etcd-cafile=/opt/etcd/ssl/ca.pem --etcd-certfile=/opt/etcd/ssl/server.pem --etcd-keyfile=/opt/etcd/ssl/server-key.pem
k8s      27590 27227  0 14:45 pts/3    00:00:00 grep --color=auto kube
```


### <a name="part2"></a> 2. kube-controller-manager

 我们先来使用半自动化脚本 `vi controller-manager.sh` 

```shell
#!/bin/bash

MASTER_ADDRESS=$1

cat <<EOF >/opt/kubernetes/cfg/kube-controller-manager


KUBE_CONTROLLER_MANAGER_OPTS="--logtostderr=false \\
--log-dir=/opt/kubernetes/logs \\
--v=4 \\
--master=${MASTER_ADDRESS}:8080 \\
--leader-elect=true \\
--address=127.0.0.1 \\
--service-cluster-ip-range=10.0.0.0/24 \\
--cluster-name=kubernetes \\
--cluster-signing-cert-file=/opt/kubernetes/ssl/ca.pem \\
--cluster-signing-key-file=/opt/kubernetes/ssl/ca-key.pem  \\
--root-ca-file=/opt/kubernetes/ssl/ca.pem \\
--service-account-private-key-file=/opt/kubernetes/ssl/ca-key.pem \\
--experimental-cluster-signing-duration=87600h0m0s"

EOF

cat <<EOF >/usr/lib/systemd/system/kube-controller-manager.service
[Unit]
Description=Kubernetes Controller Manager
Documentation=https://github.com/kubernetes/kubernetes

[Service]
EnvironmentFile=-/opt/kubernetes/cfg/kube-controller-manager
ExecStart=/opt/kubernetes/bin/kube-controller-manager \$KUBE_CONTROLLER_MANAGER_OPTS
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable kube-controller-manager
systemctl restart kube-controller-manager
```

生成配置文件，再生成一个servcie启动文件

`MASTER_ADDRESS` 指定链接 **apiserver** 地址

可以查看端口8080, `sudo netstat -antp | grep 8080` 如果没有**netstat**工具可以安装 **net-tool** 网络工具

`sudo yum install net-tool -y` 包含常用的网络工具 **netstat** 和 **ifconfig **<br />**
```bash
[k8s@k8s-master01 soft]$ sudo netstat -antp | grep 8080
tcp        0      0 127.0.0.1:8080          0.0.0.0:*               LISTEN      27579/kube-apiserve
```

如果没有显示如下信息，需要手动排错

首先可以查看 apiserver 日志 `ls /opt/kubernetes/logs/` 

`less /opt/kubernetes/logs/kube-apiserver.INFO`

`more /opt/kubernetes/logs/kube-apiserver.INFO`

也可以使用source启动配置文件 `sudo source /opt/kubernetes/cfg/kube-apiserver` 

然后在通过手动启动来排查问题 `sudo /opt/kubernetes/bin/kube-apiserver`   注意需要引用变量名

`sudo /opt/kubernetes/bin/kube-apiserver $KUBE_APISERVER_OPTS`

这样可以排查错误，修改错误之后在重启下 `sudo systemctl restart kube-apiserver` 

查看下监听端口8080 `sudo netstat -antp | grep 8080` 默认本地监听<br /> <br />`sudo netstat -antp | grep 6443`

```bash
[k8s@k8s-master01 soft]$ sudo netstat -antp | grep 8080
tcp        0      0 127.0.0.1:8080          0.0.0.0:*               LISTEN      27579/kube-apiserve 
[k8s@k8s-master01 soft]$ sudo netstat -antp | grep 6443
tcp        0      0 10.211.55.10:6443       0.0.0.0:*               LISTEN      27579/kube-apiserve 
tcp        0      0 10.211.55.10:6443       10.211.55.10:42566      ESTABLISHED 27579/kube-apiserve 
tcp        0      0 10.211.55.10:42566      10.211.55.10:6443       ESTABLISHED 27579/kube-apiserve 
```

 部署 **kube-controller-manager** 需要指定apiserver地址 ip

执行` sudo bash controller-manager.sh 127.0.0.1`  

### <a name="part3"></a>3. kube-scheduler

**scheduler** 配置与启动都和 **controller** 一样，先写 `vi scheduler.sh` 脚本文件

```bash
#!/bin/bash

MASTER_ADDRESS=$1

cat <<EOF >/opt/kubernetes/cfg/kube-scheduler

KUBE_SCHEDULER_OPTS="--logtostderr=false \\
--log-dir=/opt/kubernetes/logs \\
--v=4 \\
--master=${MASTER_ADDRESS}:8080 \\
--leader-elect"

EOF

cat <<EOF >/usr/lib/systemd/system/kube-scheduler.service
[Unit]
Description=Kubernetes Scheduler
Documentation=https://github.com/kubernetes/kubernetes

[Service]
EnvironmentFile=-/opt/kubernetes/cfg/kube-scheduler
ExecStart=/opt/kubernetes/bin/kube-scheduler \$KUBE_SCHEDULER_OPTS
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable kube-scheduler
systemctl restart kube-scheduler
```

运行 `sudo bash scheduler.sh 127.0.0.1`  

我们来查看下配置文件 `cat /opt/kubernetes/cfg/kube-controller-manager` 

```bash
[k8s@k8s-master01 soft]$ sudo bash controller-manager.sh 127.0.0.1
Created symlink from /etc/systemd/system/multi-user.target.wants/kube-controller-manager.service to /usr/lib/systemd/system/kube-controller-manager.service.
[k8s@k8s-master01 soft]$ sudo bash scheduler.sh 127.0.0.1
Created symlink from /etc/systemd/system/multi-user.target.wants/kube-scheduler.service to /usr/lib/systemd/system/kube-scheduler.service.
[k8s@k8s-master01 soft]$ cat /opt/kubernetes/cfg/kube-controller-manager

KUBE_CONTROLLER_MANAGER_OPTS="--logtostderr=false \
--log-dir=/opt/kubernetes/logs \
--v=4 \
--master=127.0.0.1:8080 \
--leader-elect=true \
--address=127.0.0.1 \
--service-cluster-ip-range=10.0.0.0/24 \
--cluster-name=kubernetes \
--cluster-signing-cert-file=/opt/kubernetes/ssl/ca.pem \
--cluster-signing-key-file=/opt/kubernetes/ssl/ca-key.pem  \
--root-ca-file=/opt/kubernetes/ssl/ca.pem \
--service-account-private-key-file=/opt/kubernetes/ssl/ca-key.pem \
--experimental-cluster-signing-duration=87600h0m0s"
```

这里也可以修改日志的存放目录，和apiserver一样

查看scheduler配置文件 `cat /opt/kubernetes/cfg/kube-scheduler`  

```bash
[k8s@k8s-master01 soft]$ cat /opt/kubernetes/cfg/kube-scheduler

KUBE_SCHEDULER_OPTS="--logtostderr=false \
--log-dir=/opt/kubernetes/logs \
--v=4 \
--master=127.0.0.1:8080 \
--leader-elect"
```

可以看到所有的服务都已经起来了

```bash
[k8s@k8s-master01 soft]$ ps -ef | grep kube
root     27579     1  2 14:45 ?        00:04:46 /opt/kubernetes/bin/kube-apiserver --logtostderr=false --log-dir=/opt/kubernetes/logs --v=4 --etcd-servers=https://10.211.55.10:2379,https://10.211.55.12:2379,https://10.211.55.13:2379 --bind-address=10.211.55.10 --secure-port=6443 --advertise-address=10.211.55.10 --allow-privileged=true --service-cluster-ip-range=10.0.0.0/24 --enable-admission-plugins=NamespaceLifecycle,LimitRanger,ServiceAccount,ResourceQuota,NodeRestriction --authorization-mode=RBAC,Node --kubelet-https=true --enable-bootstrap-token-auth --token-auth-file=/opt/kubernetes/cfg/token.csv --service-node-port-range=30000-50000 --tls-cert-file=/opt/kubernetes/ssl/server.pem --tls-private-key-file=/opt/kubernetes/ssl/server-key.pem --client-ca-file=/opt/kubernetes/ssl/ca.pem --service-account-key-file=/opt/kubernetes/ssl/ca-key.pem --etcd-cafile=/opt/etcd/ssl/ca.pem --etcd-certfile=/opt/etcd/ssl/server.pem --etcd-keyfile=/opt/etcd/ssl/server-key.pem
root     28119     1  2 17:28 ?        00:00:22 /opt/kubernetes/bin/kube-controller-manager --logtostderr=true --v=4 --master=127.0.0.1:8080 --leader-elect=true --address=127.0.0.1 --service-cluster-ip-range=10.0.0.0/24 --cluster-name=kubernetes --cluster-signing-cert-file=/opt/kubernetes/ssl/ca.pem --cluster-signing-key-file=/opt/kubernetes/ssl/ca-key.pem --root-ca-file=/opt/kubernetes/ssl/ca.pem --service-account-private-key-file=/opt/kubernetes/ssl/ca-key.pem --experimental-cluster-signing-duration=87600h0m0s
root     28177     1  1 17:33 ?        00:00:11 /opt/kubernetes/bin/kube-scheduler --logtostderr=true --v=4 --master=127.0.0.1:8080 --leader-elect
k8s      28223 27227  0 17:46 pts/3    00:00:00 grep --color=auto kube
```

查看当前集群的状态 **kubectl** 是管理 kubernetes 集群的控制台管理工具，放到 _/usr/bin/_ 目录下方便使用

先到 _soft_ 目录下解压缩 kubernetes 的  **Server Binaries **文件

解压完成之后，我们进入 `cd kubernetes/server/bin/`目录下,然后拷贝

```bash
sudo cp kubectl /usr/bin/
```

这样就可以直接上用 **kubectl** 工具来管理 kubernentes 集群了

`kubectl get cs` 检查当前节点和 **scheduler**、**controller-manager **的状态

```bash
[k8s@k8s-master01 bin]$ kubectl get cs
NAME                 STATUS    MESSAGE             ERROR
controller-manager   Healthy   ok                  
scheduler            Healthy   ok                  
etcd-2               Healthy   {"health":"true"}   
etcd-1               Healthy   {"health":"true"}   
etcd-0               Healthy   {"health":"true"} 
```

可以在命令行输入 `kubectl api-resources` 查看所有资源的缩写

**cs** 是指 **componentstatuses** 

如上面显示，就说明 master 的组件配置都是正常开启的，接下来就可以部署 kubernetes 的 Node 组件

### <a name="serial"></a>kubernetes二进制部署系列

1. [k8s部署-Etcd数据库集群部署](http://custer.me/etcd-bin-install/)
2. [k8s部署-Flannel网络](http://custer.me/flannel-bin-install/)
3. [k8s部署-Master组件](http://custer.me/kube-master/)
4. [k8s部署-Node组件](http://custer.me/kube-node/)
5. [k8s部署-多Master集群](http://custer.me/multi-master/)
