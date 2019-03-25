---
layout: post
title: "etcd使用二进制部署集群"
date: 2019-03-25 00:45:55
image: '/assets/img/'
description: k8s部署第一步-Etcd数据库集群部署
tags:
- kubernetes
- etcd
categories:
- kubernetes
twitter_text: 'k8s部署第一步-Etcd数据库集群部署'
---

#### [Part 1: 部署平台规划 ](#part1)

#### [Part 2: 准备工作](#part2)  

#### [Part 3: 自签SSL证书](#part3)  

#### [Part 4: Etcd数据库集群部署](#part4)  
1. [颁发etcd证书](#etcd)
2. [下载二进制包](#etcd-bin)
3. [etcd配置文件](#etcd-cfg)
4. [其他节点加入](#etcd-node)
5. [启动并查看集群状态](#etcd-start)

## <a name="part1"></a>部署平台规划

| 主机名 | 名称 | ip地址 | 用户名 | 密码 | 角色 | 组件 |
| --- | --- | --- | --- | --- | --- | --- |
| k8s-master01 | k8s-centos-1 | 10.211.55.10 | k8s | Root1234 | master1 | kube-apiserver<br />kuber-controller-manager<br />kuber-scheduler<br />etcd |
|  | k8s-centos-11 | 10.211.55.11 | k8s | Root1234 | master2 | kube-apiserver<br />kuber-controller-manager<br />kuber-scheduler<br />etcd |
| k8s-node01 | k8s-centos-12 | 10.211.55.12 | k8s | Root1234 | node1 | kubelet<br />kube-proxy<br />docker<br />flannel<br />etcd |
| k8s-node02 | k8s-centos-13 | 10.211.55.13 | k8s | Root1234 | node2 | kubelet<br />kube-proxy<br />docker<br />flannel<br />etcd |
|  | Load Balancer<br />(Master) | 10.211.55.14 | nginx | Root1234 | Load Balancer<br />(Master) | Nginx L4 |
|  | Load Balancer<br />(Backup) | 10.211.55.15 | nginx | Root1234 | Load Balancer<br />(Backup) | Nginx L4 |
|  | Registry | 10.211.55.16 | cicd | Root1234 | master | Harbor<br />drone<br />gitea<br />docker |

![1.png](https://cdn.nlark.com/yuque/0/2019/png/288708/1553327288638-f70769b7-2598-4b72-990c-c575f36999db.png#align=left&display=inline&height=361&name=1.png&originHeight=497&originWidth=1028&size=27106&status=done&width=746)

单**Master**集群架构图


![2.png](https://cdn.nlark.com/yuque/0/2019/png/288708/1553327328435-d539374d-34b2-4f73-8380-dc83e3afc4d0.png#align=left&display=inline&height=262&name=2.png&originHeight=522&originWidth=1485&size=42432&status=done&width=746)


多**Master**集群架构图

## <a name="part2"></a>准备工作

### 1. 关闭 firewalld 防火墙

systemctl是CentOS7的服务管理工具中主要的工具

- 关闭 firewalld 防火墙

`systemctl stop firewalld`

- 禁用 firewalld 开机自启

`systemctl disable firewalld`

保证 iptables -vnL 都是空的

### 2. 关闭 SELINUX 并重启系统 - 强制访问安全策略

`vi /etc/sysconfig/selinux ... SELINUX=disabled ...`

或者修改`vi /etc/selinux/config`

记得修改之后需要重启 `reboot`，使得禁用生效

也可以使用立即生效命令 `setenforce 0`

重启之后登录进来，输入 `getenforce` 查看策略是否禁用 `Disabled`

可以看到被成功的 **Disable** 了

查看firewalld防火墙状态：`# systemctl status firewalld`

启动： `# systemctl start firewalld`

开机启用 ： `# systemctl enable firewalld`

### 3. 修改主机名：

`vi /etc/hostname` 为 **k8s-master01**

然后在命令行输入`hostname k8s-master01`

退出重新进入终端就可以显示出主机名

### 4. 同步互联网时间

每次恢复快照都需要做此操作，确保启动集群不会出现问题

看是否需要同步下互联网时间 `ntpdate time.windows.com `

> 其他机器也都需要按照这个步骤来做机器的初始状态

## <a name="part3"></a>自签SSL证书

| 组件 | 使用的证书 |
| --- | --- |
| etcd | ca.pem，server.pem，server-key.pem |
| flannel | ca.pem，server.pem，server-key.pem |
| kube-apiserver | ca.pem，server.pem，server-key.pem |
| kubelet | ca.pem，ca-key.pem |
| kube-proxy | ca.pem，kube-proxy.pem，kube-proxy-key.pem |
| kubectl | ca.pem，admin.pem，admin-key.pem |

## <a name="part4"></a>Etcd数据库集群部署

### <a name="etcd"></a>颁发etcd证书

我们在 _k8s-master01_ 的主机上，新建一个目录 `mkdir k8s`，并进入该目录 `cd k8s`，然后新建两个目录为 `mkdir k8s-cert` 和 `mkdir etcd-cert`，进入 _etcd-cert_ 目录下来生成根证书

首先需要安装生成证书的 **cfssl** 工具，我们在目录 _etcd-cert_ 下新建一个文件 `vim cfssl.sh`，写入下面的命令

```vim
curl -L https://pkg.cfssl.org/R1.2/cfssl_linux-amd64 -o /usr/local/bin/cfssl
curl -L https://pkg.cfssl.org/R1.2/cfssljson_linux-amd64 -o /usr/local/bin/cfssljson
curl -L https://pkg.cfssl.org/R1.2/cfssl-certinfo_linux-amd64 -o /usr/local/bin/cfssl-certinfo
chmod +x /usr/local/bin/cfssl /usr/local/bin/cfssljson /usr/local/bin/cfssl-certinfo
```

这个脚本非常简单，就是自动下载文件到执行目录下，然后加上执行权限而已

保存并执行命令 `bash cfssl.sh`, 可以查看 `cfssl` 工具已经安装好了

让我们在命令行直接复制粘贴运行下面的代码

```bash
cat > ca-config.json <<EOF
{
  "signing": {
    "default": {
      "expiry": "87600h"
    },
    "profiles": {
      "www": {
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
```

即以免交互的方式把 json 格式的数据以自动追加的形式(EOF)写入 **ca-config.json** 文件中。

注意这里：`expiry: 87600h` 我们设置的有效期是10年

然后再继续以免交互的方式把 json 格式的数据以自动追加的形式(EOF)写入 **ca-csr.json** 文件中

```bash
cat > ca-csr.json <<EOF
{
    "CN": "etcd CA",
    "key": {
        "algo": "rsa",
        "size": 2048
    },
    "names": [
        {
            "C": "CN",
            "L": "Beijing",
            "ST": "Beijing"
        }
    ]
}
EOF
```

现在查看目录，目录下有两个新增的json文件

```bash
.
└── k8s
    ├── etcd-cert
    │   ├── ca-config.json
    │   ├── ca-csr.json
    │   ├── cfssl.sh
    └── k8s-cert
```

下面在命令行执行 `cfssl gencert -initca ca-csr.json | cfssljson -bare ca -` 生成ca的根证书

```bash
[k8s@k8s-master01 etcd-cert]$ cfssl gencert -initca ca-csr.json | cfssljson -bare ca -
2019/03/23 04:34:56 [INFO] generating a new CA key and certificate from CSR
2019/03/23 04:34:56 [INFO] generate received request
2019/03/23 04:34:56 [INFO] received CSR
2019/03/23 04:34:56 [INFO] generating key: rsa-2048
2019/03/23 04:34:56 [INFO] encoded CSR
2019/03/23 04:34:56 [INFO] signed certificate with serial number 333274805033467449187583136812625576271693117599
[k8s@k8s-master01 etcd-cert]$ ls
ca-config.json  ca.csr  ca-csr.json  ca-key.pem  ca.pem  cfssl.sh
```

生成了 **ca-key.pem** 文件和 **ca.pem** 文件，这两个根证书

现在我们就可以使用这两个文件来颁发证书了

```bash
cat > server-csr.json <<EOF
{
    "CN": "etcd",
    "hosts": [
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
    ],
    "key": {
        "algo": "rsa",
        "size": 2048
    },
    "names": [
        {
            "C": "CN",
            "L": "BeiJing",
            "ST": "BeiJing"
        }
    ]
}
EOF
```

我们继续以免交互的方式把 json 格式的数据以自动追加的形式(EOF)写入 **server-csr.json** 文件中

> 这里注意一定要包含每个 **etcd** 节点的 **ip** 地址

通过执行 `cfssl gencert -ca=ca.pem -ca-key=ca-key.pem -config=ca-config.json -profile=www server-csr.json | cfssljson -bare server` 来颁发证书

生成的证书：

```bash
.
└── k8s
    ├── etcd-cert
    │   ├── ca-config.json
    │   ├── ca.csr
    │   ├── ca-csr.json
    │   ├── ca-key.pem
    │   ├── ca.pem
    │   ├── cfssl.sh
    │   ├── server.csr
    │   ├── server-csr.json
    │   ├── server-key.pem
    │   └── server.pem
    └── k8s-cert
```

生成了 **server-key.pem** 和 **server.pem** 证书文件

### <a name="etcd-bin"></a>下载二进制包

二进制包下载地址： <https://github.com/etcd-io/etcd/releases> 注意对应的平台

我们在根目录下新建一个 _soft_ 目录存放下载的包， 下载好并解压缩

在命令行新建几个目录  `mkdir /opt/etcd/{ssl,cfg,bin} -p`

然后把解压缩文件中的 **etcd etcdctl** 文件 移动到新建的 _bin_ 目录下

`mv etcd etcdctl /opt/etcd/bin/`

现在我们要做**etcd**的配置，先到 _k8s_ 目录下新建 `vi etcd.sh` 文件

```shell
#!/bin/bash
# example: ./etcd.sh etcd01 192.168.1.10 etcd02=https://192.168.1.11:2380,etcd03=https://192.168.1.12:2380

ETCD_NAME=$1
ETCD_IP=$2
ETCD_CLUSTER=$3

WORK_DIR=/opt/etcd

cat <<EOF >$WORK_DIR/cfg/etcd
#[Member]
ETCD_NAME="${ETCD_NAME}"
ETCD_DATA_DIR="/var/lib/etcd/default.etcd"
ETCD_LISTEN_PEER_URLS="https://${ETCD_IP}:2380"
ETCD_LISTEN_CLIENT_URLS="https://${ETCD_IP}:2379"

#[Clustering]
ETCD_INITIAL_ADVERTISE_PEER_URLS="https://${ETCD_IP}:2380"
ETCD_ADVERTISE_CLIENT_URLS="https://${ETCD_IP}:2379"
ETCD_INITIAL_CLUSTER="etcd01=https://${ETCD_IP}:2380,${ETCD_CLUSTER}"
ETCD_INITIAL_CLUSTER_TOKEN="etcd-cluster"
ETCD_INITIAL_CLUSTER_STATE="new"
EOF

cat <<EOF >/usr/lib/systemd/system/etcd.service
[Unit]
Description=Etcd Server
After=network.target
After=network-online.target
Wants=network-online.target

[Service]
Type=notify
EnvironmentFile=${WORK_DIR}/cfg/etcd
ExecStart=${WORK_DIR}/bin/etcd \
--name=\${ETCD_NAME} \
--data-dir=\${ETCD_DATA_DIR} \
--listen-peer-urls=\${ETCD_LISTEN_PEER_URLS} \
--listen-client-urls=\${ETCD_LISTEN_CLIENT_URLS},http://127.0.0.1:2379 \
--advertise-client-urls=\${ETCD_ADVERTISE_CLIENT_URLS} \
--initial-advertise-peer-urls=\${ETCD_INITIAL_ADVERTISE_PEER_URLS} \
--initial-cluster=\${ETCD_INITIAL_CLUSTER} \
--initial-cluster-token=\${ETCD_INITIAL_CLUSTER_TOKEN} \
--initial-cluster-state=new \
--cert-file=${WORK_DIR}/ssl/server.pem \
--key-file=${WORK_DIR}/ssl/server-key.pem \
--peer-cert-file=${WORK_DIR}/ssl/server.pem \
--peer-key-file=${WORK_DIR}/ssl/server-key.pem \
--trusted-ca-file=${WORK_DIR}/ssl/ca.pem \
--peer-trusted-ca-file=${WORK_DIR}/ssl/ca.pem
Restart=on-failure
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable etcd
systemctl start etcd
```

然后增加执行权限 `chmod +x etcd.sh` 这个脚本作用是部署 etcd 的

### <a name="etcd-cfg"></a>etcd配置文件

部署etcd主要有两步

- 第一步： 创建配置文件，决定了监听哪些端口，告知集群中其他节点是什么

- 第二步： 创建 _systemd_ 的 _.service_ 文件，使用 _systemd_ 来管理`etcd`，_systemd_ 是 centos7 默认的服务管理工具，通过配置文件来管理服务的

使用方式：

`./etcd.sh etcd01 10.211.55.10 etcd02=https://10.211.55.12:2380,etcd03=https://10.211.55.13:2380`

etcd01 本机在集群中的名称，主机ip，etcd02别的主机在集群中的名称和ip和端口号

2380是集群间的通信，2379是数据的通信端口

执行之后，是会报错的，但是配置文件已经写入成功 

`cat /opt/etcd/cfg/etcd`

可以查看到

```bash
[k8s@k8s-master01 k8s]$ sudo ./etcd.sh etcd01 10.211.55.10 etcd02=https://10.211
.55.11:2380,etcd03=https://10.211.55.12:2380
[sudo] password for k8s: 
Created symlink from /etc/systemd/system/multi-user.target.wants/etcd.service to /usr/lib/systemd/system/etcd.service.
Job for etcd.service failed because the control process exited with error code. See "systemctl status etcd.service" and "journalctl -xe" for details.
[k8s@k8s-master01 k8s]$ cat /opt/etcd/cfg/etcd 
#[Member]
ETCD_NAME="etcd01"
ETCD_DATA_DIR="/var/lib/etcd/default.etcd"
ETCD_LISTEN_PEER_URLS="https://10.211.55.10:2380"
ETCD_LISTEN_CLIENT_URLS="https://10.211.55.10:2379"

#[Clustering]
ETCD_INITIAL_ADVERTISE_PEER_URLS="https://10.211.55.10:2380"
ETCD_ADVERTISE_CLIENT_URLS="https://10.211.55.10:2379"
ETCD_INITIAL_CLUSTER="etcd01=https://10.211.55.10:2380,etcd02=https://10.211.55.12:2380,etcd03=https://10.211.55.13:2380"
ETCD_INITIAL_CLUSTER_TOKEN="etcd-cluster"
ETCD_INITIAL_CLUSTER_STATE="new"
```

继续查看 _service_ 是否写入成功

`cat /usr/lib/systemd/system/etcd.service`

```bash
[k8s@k8s-master01 k8s]$ cat /usr/lib/systemd/system/etcd.service
[Unit]
Description=Etcd Server
After=network.target
After=network-online.target
Wants=network-online.target

[Service]
Type=notify
EnvironmentFile=/opt/etcd/cfg/etcd
ExecStart=/opt/etcd/bin/etcd --name=${ETCD_NAME} --data-dir=${ETCD_DATA_DIR} --listen-peer-urls=${ETCD_LISTEN_PEER_URLS} --listen-client-urls=${ETCD_LISTEN_CLIENT_URLS},http://127.0.0.1:2379 --advertise-client-urls=${ETCD_ADVERTISE_CLIENT_URLS} --initial-advertise-peer-urls=${ETCD_INITIAL_ADVERTISE_PEER_URLS} --initial-cluster=${ETCD_INITIAL_CLUSTER} --initial-cluster-token=${ETCD_INITIAL_CLUSTER_TOKEN} --initial-cluster-state=new --cert-file=/opt/etcd/ssl/server.pem --key-file=/opt/etcd/ssl/server-key.pem --peer-cert-file=/opt/etcd/ssl/server.pem --peer-key-file=/opt/etcd/ssl/server-key.pem --trusted-ca-file=/opt/etcd/ssl/ca.pem --peer-trusted-ca-file=/opt/etcd/ssl/ca.pem
Restart=on-failure
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

> 注意上面代码中的 `--cert-file` 是需要使用的证书， `--peer-cert-file` 是集群需要使用的证书

所以我们接下来拷贝证书：

`cp ~/k8s/etcd-cert/{ca,server-key,server}.pem /opt/etcd/ssl/`

### <a name="etcd-node"></a>其他节点加入

现在再增加节点，只需要拷贝刚才的配置就可以了，不需要再按照刚才的配置再走一遍

```bash
sudo scp -r /opt/etcd/ root@10.211.55.12:/opt/

sudo scp -r /opt/etcd/ root@10.211.55.13:/opt/

sudo scp /usr/lib/systemd/system/etcd.service root@10.211.55.12:/usr/lib/systemd/system

sudo scp /usr/lib/systemd/system/etcd.service root@10.211.55.13:/usr/lib/systemd/system
```

然后需要在每个节点中修改自己的名字和ip才能正常启动

`vi /opt/etcd/cfg/etcd`

```bash
#[Member]
ETCD_NAME="etcd02" # 修改名字
ETCD_DATA_DIR="/var/lib/etcd/default.etcd" 
ETCD_LISTEN_PEER_URLS="https://10.211.55.12:2380" # 修改本机ip
ETCD_LISTEN_CLIENT_URLS="https://10.211.55.12:2379" # 修改本机ip

#[Clustering]
ETCD_INITIAL_ADVERTISE_PEER_URLS="https://10.211.55.12:2380" # 修改本机ip
ETCD_ADVERTISE_CLIENT_URLS="https://10.211.55.12:2379" # 修改本机ip
ETCD_INITIAL_CLUSTER="etcd01=https://10.211.55.10:2380,etcd02=https://10.211.55.12:2380,etcd03=https://10.211.55.13:2380"
ETCD_INITIAL_CLUSTER_TOKEN="etcd-cluster"
ETCD_INITIAL_CLUSTER_STATE="new"
```

修改之后就可以启动了，启动之前如果它提示需要

`reload systemctl daemon-reload`，执行即可

几个节点都需要做相对应的修改

然后在每个节点中都依次执行 `sudo systemctl start etcd` 即可

如果出现错误，可以查看日志，找出问题修改错误

`sudo tail /var/log/messages -f`   **-f** 是持续查看，可以不用添加

### <a name="etcd-start"></a>启动并查看集群状态

```bash
/opt/etcd/bin/etcdctl \
--ca-file=/opt/etcd/ssl/ca.pem --cert-file=/opt/etcd/ssl/server.pem --key-file=/opt/etcd/ssl/server-key.pem \
--endpoints="https://10.211.55.10:2379,https://10.211.55.12:2379,https://10.211.55.13:2379" \
cluster-health
```

删除**etcd** `rm -rf /opt/etcd /var/lib/etcd/`

删除**kubernetes** `rm -rf /opt/kubernetes`

关闭进程 `pkill etcd`，`pkill flanneld`

查看进程 `ps -ef | grep etcd`
