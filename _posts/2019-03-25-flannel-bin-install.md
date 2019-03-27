---
layout: post
title: "2.k8s部署-flannel使用二进制安装"
date: 2019-03-25 00:55:58
image: '/assets/img/'
description: 'k8s部署第二步-Flannel网络的部署'
tags:
- kubernetes
- flannel
categories:
- kubernetes
twitter_text: 'k8s部署第二步-Flannel网络的部署'
---

#### [Part 1: Uninstall old docker versions ](#part1)

#### [Part 2: Install using the repository](#part2)  

#### [Part 3: INSTALL DOCKER CE](#part3)  

#### [Part 4: daocloud加速](#part4)

#### [Part 5: docker sudo](#part5)

#### [Part 6: Kubernetes网络模型（CNI）](#part6)

#### [Part 7: 部署Kubernetes网络 - Flannel](#part7)

#### [Part 8: 使用二进制部署Flannel](#part8)

#### [Part 9: 验证](#part10)

#### [kubernetes二进制部署系列](#serial)

1. [颁发etcd证书](#etcd)

![1.png](https://cdn.nlark.com/yuque/0/2019/png/288708/1553497887997-a51f6beb-23b7-45b8-b56a-30f6de5904f5.png#align=left&display=inline&height=433&name=1.png&originHeight=433&originWidth=650&size=37306&status=done&width=650)

Docker的安装 [https://docs.docker.com/install/linux/docker-ce/centos/](https://docs.docker.com/install/linux/docker-ce/centos/) 安装在 两个node节点上

### <a name="part1"></a> Uninstall old docker versions

```bash
sudo yum remove docker \
                  docker-client \
                  docker-client-latest \
                  docker-common \
                  docker-latest \
                  docker-latest-logrotate \
                  docker-logrotate \
                  docker-engine
```

### <a name="part2"></a> Install using the repository

```bash
sudo yum install -y yum-utils \
  device-mapper-persistent-data \
  lvm2
```

```bash
sudo yum-config-manager \
    --add-repo \
    https://download.docker.com/linux/centos/docker-ce.repo
```

### <a name="part3"></a>INSTALL DOCKER CE

```bash
sudo yum install docker-ce docker-ce-cli containerd.io
```

### <a name="part4"></a>daocloud加速

```bash
curl -sSL https://get.daocloud.io/daotools/set_mirror.sh | sh -s http://f1361db2.m.daocloud.io
```

重启docker

```bash
sudo systemctl restart docker
```

### <a name="part5"></a> docker sudo

由于docker daemon需要绑定到主机的Unix socket而不是普通的TCP端口，而Unix socket的属主为root用户，所以其他用户只有在命令前添加sudo选项才能执行相关操作。

如果不想每次使用docker命令的时候还要额外的敲一下sudo，可以按照下面的方法配置一下。

1. 创建一个docker组
1. `$ sudo groupadd docker`
1. 添加当前用户到docker组
1. `$ sudo usermod -aG docker $USER`
1. 登出，重新登录shell
1. 验证docker命令是否可以运行
1. `$ docker ps`

### <a name="part6"></a>Kubernetes网络模型（CNI）

**Container** **Network** **Interface(CNI)：容器网络接口，** **Google和CoreOS主导。**<br />**Kubernetes网络模型设计基本要求：
* 一个Pod一个IP
* 每个Pod独立IP，Pod内所有容器共享网络（同一个IP）
* 所有容器都可以与所有其他容器通信
* 所有节点都可以与所有容器通信

### <a name="part7"></a>部署Kubernetes网络 - Flannel
![2.png](https://cdn.nlark.com/yuque/0/2019/png/288708/1553499039634-23ec8175-5e85-4565-8227-408b5e545e3e.png#align=left&display=inline&height=514&name=2.png&originHeight=779&originWidth=1130&size=97240&status=done&width=746)

**Overlay** **Network：**覆盖网络，在基础网络上叠加的一种虚拟网络技术模式，该网络中的主机通过虚拟链路连接起来。<br />[**Flannel**](https://github.com/coreos/flannel)**：**是Overlay网络的一种，也是将源数据包封装在另一种网络包里面进行路由转发和通信，目前已经支持UDP、VXLAN、host-gw、AWS VPC和GCE路由等数据转发方式。

1. 容器直接使用目标容器的ip访问，默认通过容器内部的eth0发送出去。<br />
1. 报文通过veth pair被发送到vethXXX。<br />
1. vethXXX是直接连接到虚拟交换机docker0的，报文通过虚拟bridge docker0发送出去。<br />
1. 查找路由表，外部容器ip的报文都会转发到flannel0虚拟网卡，这是一个P2P的虚拟网卡，然后报文就被转发到监听在另一端的flanneld。<br />
1. flanneld通过etcd维护了各个节点之间的路由表，把原来的报文UDP封装一层，通过配置的iface发送出去。<br />
1. 报文通过主机之间的网络找到目标主机。<br />
1. 报文继续往上，到传输层，交给监听在8285端口的flanneld程序处理。<br />
1. 数据被解包，然后发送给flannel0虚拟网卡。<br />
1. 查找路由表，发现对应容器的报文要交给docker0。<br />
1. docker0找到连到自己的容器，把报文发送过去。

### <a name="part8"></a>使用二进制部署Flannel

1. 写入分配的子网段到etcd，供flanneld使用

```bash
sudo /opt/etcd/bin/etcdctl \
--ca-file=ca.pem --cert-file=server.pem --key-file=server-key.pem \
--endpoints="https://192.168.0.x:2379,https://192.168.0.x:2379,https://192.168.0.x:2379" \
set /coreos.com/network/config '{ "Network": "172.17.0.0/16", "Backend": {"Type": "vxlan"}}'
```

查看etcd集群状态

```bash
[k8s@k8s-master01 ~]$ sudo /opt/etcd/bin/etcdctl \
> --ca-file=/opt/etcd/ssl/ca.pem --cert-file=/opt/etcd/ssl/server.pem --key-file=/opt/etcd/ssl/server-key.pem \
> --endpoints="https://10.211.55.10:2379,https://10.211.55.12:2379,https://10.211.55.13:2379" \
> cluster-health
[sudo] password for k8s: 
member 9fb659a92dca6454 is healthy: got healthy result from https://10.211.55.10:2379
member f9c27963788aad6e is healthy: got healthy result from https://10.211.55.12:2379
member ff2f490dbe25f877 is healthy: got healthy result from https://10.211.55.13:2379
cluster is healthy
```

只需要把 cluster-health 集群健康检查修改为设置**分配子网**段即可

```bash
sudo /opt/etcd/bin/etcdctl \
--ca-file=/opt/etcd/ssl/ca.pem --cert-file=/opt/etcd/ssl/server.pem --key-file=/opt/etcd/ssl/server-key.pem \
--endpoints="https://10.211.55.10:2379,https://10.211.55.12:2379,https://10.211.55.13:2379" \
set /coreos.com/network/config '{ "Network": "172.17.0.0/16", "Backend": {"Type": "host-gw"}}'
```

`/coreos.com/network/config` 是 Flannel 固定的键值对的键名称，只需要在 Type中设置 flannel 的数据转发方式为 host-gw

也可以使用 `get `查看 `/coreos.com/network/config` 具体的值

```bash
sudo /opt/etcd/bin/etcdctl \
--ca-file=/opt/etcd/ssl/ca.pem --cert-file=/opt/etcd/ssl/server.pem --key-file=/opt/etcd/ssl/server-key.pem \
--endpoints="https://10.211.55.10:2379,https://10.211.55.12:2379,https://10.211.55.13:2379" \
get /coreos.com/network/config
```

1. 下载二进制包

[https://github.com/coreos/flannel/releases](https://github.com/coreos/flannel/releases)

flannel 主要是部署在 node 节点，master 是否部署 flannel 是可选的<br />在 soft 目录存放下载的包， 下载好并解压缩

1. 部署与配置Flannel

然后使用 flannel.sh 脚本文件来生成 flannel 的配置文件，和 systemd 的启动文件

为了方便管理 k8s 相关组件，我们新建 k8s 的工作目录

`sudo mkdir -p /opt/kubernetes/{bin,cfg,ssl}`

然后把上面解压的文件移动到刚创建的 /opt/kubernetes/bin 目录下

`sudo mv flanneld mk-docker-opts.sh /opt/kubernetes/bin/`

```shell
#!/bin/bash

ETCD_ENDPOINTS=${1:-"http://127.0.0.1:2379"}

cat <<EOF >/opt/kubernetes/cfg/flanneld

FLANNEL_OPTIONS="--etcd-endpoints=${ETCD_ENDPOINTS} \
-etcd-cafile=/opt/etcd/ssl/ca.pem \
-etcd-certfile=/opt/etcd/ssl/server.pem \
-etcd-keyfile=/opt/etcd/ssl/server-key.pem"

EOF

cat <<EOF >/usr/lib/systemd/system/flanneld.service
[Unit]
Description=Flanneld overlay address etcd agent
After=network-online.target network.target
Before=docker.service

[Service]
Type=notify
EnvironmentFile=/opt/kubernetes/cfg/flanneld
ExecStart=/opt/kubernetes/bin/flanneld --ip-masq \$FLANNEL_OPTIONS
ExecStartPost=/opt/kubernetes/bin/mk-docker-opts.sh -k DOCKER_NETWORK_OPTIONS -d /run/flannel/subnet.env
Restart=on-failure

[Install]
WantedBy=multi-user.target

EOF

cat <<EOF >/usr/lib/systemd/system/docker.service

[Unit]
Description=Docker Application Container Engine
Documentation=https://docs.docker.com
After=network-online.target firewalld.service
Wants=network-online.target

[Service]
Type=notify
EnvironmentFile=/run/flannel/subnet.env
ExecStart=/usr/bin/dockerd \$DOCKER_NETWORK_OPTIONS
ExecReload=/bin/kill -s HUP \$MAINPID
LimitNOFILE=infinity
LimitNPROC=infinity
LimitCORE=infinity
TimeoutStartSec=0
Delegate=yes
KillMode=process
Restart=on-failure
StartLimitBurst=3
StartLimitInterval=60s

[Install]
WantedBy=multi-user.target

EOF

systemctl daemon-reload
systemctl enable flanneld
systemctl restart flanneld
systemctl restart docker
```

然后再执行 `bash flannel.sh`需要加上怎么连接etcd的参数[`https://10.211.55.10:2379`](https://10.211.55.10:2379)`,`[`https://10.211.55.12:2379`](https://10.211.55.12:2379)`,``[https://10.211.55.13:2379](https://10.211.55.13:2379)`<br />以后所有需要连接etcd的都需要以这种方式连接

```bash
bash flannel.sh https://10.211.55.10:2379,https://10.211.55.12:2379,https://10.211.55.13:2379
```

可以查看生成的文件 `cat /opt/kubernetes/cfg/flanneld` 

```bash
[k8s@k8s-node02 ~]$ cat /opt/kubernetes/cfg/flanneld

FLANNEL_OPTIONS=
"--etcd-endpoints=https://10.211.55.10:2379,
https://10.211.55.12:2379,https://10.211.55.13:2379 
-etcd-cafile=/opt/etcd/ssl/ca.pem 
-etcd-certfile=/opt/etcd/ssl/server.pem 
-etcd-keyfile=/opt/etcd/ssl/server-key.pem"
```


1. systemd管理Flannel

1. 配置Docker使用Flannel生成的子网

1. 启动Flannel

启动 flannel `sudo systemctl start flanneld`查看启动的结果 `ps -ef | grep flannel`

查看 docker 是否启用了子网 `ps -ef | grep dockerd`  我们确认下修改docker的文件是否生效

`cat /usr/lib/systemd/system/docker.service`

```bash
[k8s@k8s-node02 ~]$ cat /usr/lib/systemd/system/docker.service

[Unit]
Description=Docker Application Container Engine
Documentation=https://docs.docker.com
After=network-online.target firewalld.service
Wants=network-online.target

[Service]
Type=notify
EnvironmentFile=/run/flannel/subnet.env
ExecStart=/usr/bin/dockerd $DOCKER_NETWORK_OPTIONS
ExecReload=/bin/kill -s HUP $MAINPID
LimitNOFILE=infinity
LimitNPROC=infinity
LimitCORE=infinity
TimeoutStartSec=0
Delegate=yes
KillMode=process
Restart=on-failure
StartLimitBurst=3
StartLimitInterval=60s

[Install]
WantedBy=multi-user.target
```

注意这两行是添加的之外其他都是默认的

```bash
EnvironmentFile=/run/flannel/subnet.env
ExecStart=/usr/bin/dockerd $DOCKER_NETWORK_OPTIONS
```

可以查看还没有修改的node01的docker.service文件

```bash
[k8s@k8s-node01 ~]$ cat /usr/lib/systemd/system/docker.service
[Unit]
Description=Docker Application Container Engine
Documentation=https://docs.docker.com
BindsTo=containerd.service
After=network-online.target firewalld.service containerd.service
Wants=network-online.target
Requires=docker.socket

[Service]
Type=notify
# the default is not to use systemd for cgroups because the delegate issues still
# exists and systemd currently does not support the cgroup feature set required
# for containers run by docker
ExecStart=/usr/bin/dockerd -H fd:// --containerd=/run/containerd/containerd.sock
ExecReload=/bin/kill -s HUP $MAINPID
TimeoutSec=0
RestartSec=2
Restart=always

# Note that StartLimit* options were moved from "Service" to "Unit" in systemd 229.
# Both the old, and new location are accepted by systemd 229 and up, so using the old location
# to make them work for either version of systemd.
StartLimitBurst=3

# Note that StartLimitInterval was renamed to StartLimitIntervalSec in systemd 230.
# Both the old, and new name are accepted by systemd 230 and up, so using the old name to make
# this option work for either version of systemd.
StartLimitInterval=60s

# Having non-zero Limit*s causes performance problems due to accounting overhead
# in the kernel. We recommend using cgroups to do container-local accounting.
LimitNOFILE=infinity
LimitNPROC=infinity
LimitCORE=infinity

# Comment TasksMax if your systemd version does not supports it.
# Only systemd 226 and above support this option.
TasksMax=infinity

# set delegate yes so that systemd does not reset the cgroups of docker containers
Delegate=yes

# kill only the docker process, not all processes in the cgroup
KillMode=process

[Install]
WantedBy=multi-user.target
```

`EnvironmentFile=/run/flannel/subnet.env`是读取flannel生成的子网

可以查看 `cat ``/run/flannel/subnet.env`

```bash
[k8s@k8s-node02 ~]$ cat /run/flannel/subnet.env
DOCKER_OPT_BIP="--bip=172.17.40.1/24"
DOCKER_OPT_IPMASQ="--ip-masq=false"
DOCKER_OPT_MTU="--mtu=1500"
DOCKER_NETWORK_OPTIONS=" --bip=172.17.40.1/24 --ip-masq=false --mtu=1500"
```

docker启动如果引用了`ExecStart=/usr/bin/dockerd $DOCKER_NETWORK_OPTIONS` 可以查看docker启动的网络是否是flannel设置的子网`DOCKER_NETWORK_OPTIONS=" --bip=172.17.40.1/24 --ip-masq=false --mtu=1500"`

重启 docker `sudo systemctl restart docker`  再查看 `ps -ef | grep docker`  

```bash
[k8s@k8s-node02 ~]$ ps -ef | grep docker
root     26692     1  0 09:34 ?        00:00:00 /usr/bin/dockerd --bip=172.17.40.1/24 --ip-masq=false --mtu=1500
k8s      26852 24900  0 09:35 pts/0    00:00:00 grep --color=auto docker
```

可以查看docker使用了flannel分配的子网，可以再通过 ifconfig 确认下docker0 的ip

如果没有 `ifconfig` 可以安装 `sudo yum install net-tools ` 或者使用 `ip address`

每个节点上，则不像vxlan一样会有一个flannel.1的bridge，取而代之的是新建的一些列路由

```bash
[k8s@k8s-node02 ~]$ ip route
default via 10.211.55.1 dev eth0 proto dhcp metric 100 
10.211.55.0/24 dev eth0 proto kernel scope link src 10.211.55.13 metric 100 
172.17.40.0/24 dev docker0 proto kernel scope link src 172.17.40.1 
```

这样我们把node02节点是部署的flannel直接拷贝到其他node节点

```bash
sudo scp -r /opt/kubernetes/ root@10.211.55.12:/opt/

sudo scp /usr/lib/systemd/system/{flanneld,docker}.service root@10.211.55.12:/usr/lib/systemd/system/
```

这样就可以直接在其他node几点启动 `sudo systemctl start flanneld`  ，就可以查看到启动的进程

```bash
[k8s@k8s-node01 ~]$ ps -ef | grep flanneld
root     25987     1  0 09:53 ?        00:00:00 /opt/kubernetes/bin/flanneld --ip-masq --etcd-endpoints=https://10.211.55.10:2379,https://10.211.55.12:2379,https://10.211.55.13:2379 -etcd-cafile=/opt/etcd/ssl/ca.pem -etcd-certfile=/opt/etcd/ssl/server.pem -etcd-keyfile=/opt/etcd/ssl/server-key.pem
k8s      26042 25654  0 09:53 pts/0    00:00:00 grep --color=auto flanneld
```

然后再重启下 docker `sudo systemctl restart docker`确保使用的是 flannel 网络就可以了

```bash
[k8s@k8s-node01 ~]$ sudo systemctl daemon-reload
[k8s@k8s-node01 ~]$ sudo systemctl restart docker
[k8s@k8s-node01 ~]$ ps -ef | grep docker
root     26374     1  1 09:56 ?        00:00:00 /usr/bin/dockerd --bip=172.17.68.1/24 --ip-masq=false --mtu=1500
k8s      26499 25654  0 09:56 pts/0    00:00:00 grep --color=auto docker
[k8s@k8s-node01 ~]$ ip route
default via 10.211.55.1 dev eth0 proto dhcp metric 100 
10.211.55.0/24 dev eth0 proto kernel scope link src 10.211.55.12 metric 100 
172.17.40.0/24 via 10.211.55.13 dev eth0 
172.17.68.0/24 dev docker0 proto kernel scope link src 172.17.68.1 
```

### <a name="part9"></a>验证

* 所有容器都可以与所有其他容器通信
* 所有节点都可以与所有容器通信

 我们在node02节点运行 `docker run -it busybox`  

```bash
[k8s@k8s-node02 ~]$ docker run -it busybox
Unable to find image 'busybox:latest' locally
latest: Pulling from library/busybox
697743189b6d: Pull complete 
Digest: sha256:4415a904b1aca178c2450fd54928ab362825e863c0ad5452fd020e92f7a6a47e
Status: Downloaded newer image for busybox:latest
/ # ifconfig
eth0      Link encap:Ethernet  HWaddr 02:42:AC:11:28:02  
          inet addr:172.17.40.2  Bcast:172.17.40.255  Mask:255.255.255.0
          UP BROADCAST RUNNING MULTICAST  MTU:1500  Metric:1
          RX packets:14 errors:0 dropped:0 overruns:0 frame:0
          TX packets:0 errors:0 dropped:0 overruns:0 carrier:0
          collisions:0 txqueuelen:0 
          RX bytes:1172 (1.1 KiB)  TX bytes:0 (0.0 B)

lo        Link encap:Local Loopback  
          inet addr:127.0.0.1  Mask:255.0.0.0
          UP LOOPBACK RUNNING  MTU:65536  Metric:1
          RX packets:0 errors:0 dropped:0 overruns:0 frame:0
          TX packets:0 errors:0 dropped:0 overruns:0 carrier:0
          collisions:0 txqueuelen:1000 
          RX bytes:0 (0.0 B)  TX bytes:0 (0.0 B)

/ # 
```

我们在node01节点ping一下

```bash
[k8s@k8s-node01 ~]$ ping 172.17.40.2
PING 172.17.40.2 (172.17.40.2) 56(84) bytes of data.
64 bytes from 172.17.40.2: icmp_seq=1 ttl=63 time=0.335 ms
```

node01节点可以访问node02的容器，现在我们在node01节点创建容器`docker run -it busybox`  

```bash
[k8s@k8s-node01 ~]$ docker run -it busybox
Unable to find image 'busybox:latest' locally
latest: Pulling from library/busybox
697743189b6d: Pull complete 
Digest: sha256:506f440802e1dc578a9953dd0957a48caeb6a4008df9af04a75d9e184aa01006
Status: Downloaded newer image for busybox:latest
/ # ifconfig
eth0      Link encap:Ethernet  HWaddr 02:42:AC:11:44:02  
          inet addr:172.17.68.2  Bcast:172.17.68.255  Mask:255.255.255.0
          UP BROADCAST RUNNING MULTICAST  MTU:1500  Metric:1
          RX packets:16 errors:0 dropped:0 overruns:0 frame:0
          TX packets:0 errors:0 dropped:0 overruns:0 carrier:0
          collisions:0 txqueuelen:0 
          RX bytes:1312 (1.2 KiB)  TX bytes:0 (0.0 B)

lo        Link encap:Local Loopback  
          inet addr:127.0.0.1  Mask:255.0.0.0
          UP LOOPBACK RUNNING  MTU:65536  Metric:1
          RX packets:0 errors:0 dropped:0 overruns:0 frame:0
          TX packets:0 errors:0 dropped:0 overruns:0 carrier:0
          collisions:0 txqueuelen:1000 
          RX bytes:0 (0.0 B)  TX bytes:0 (0.0 B)

/ # 
```

现在我们在node02的容器中访问node01的容器

```bash
/ # ping 172.17.68.2
PING 172.17.68.2 (172.17.68.2): 56 data bytes
64 bytes from 172.17.68.2: seq=0 ttl=62 time=0.430 ms
```

我们可以在etcd的master节点列出

```bash
sudo /opt/etcd/bin/etcdctl \
--ca-file=/opt/etcd/ssl/ca.pem --cert-file=/opt/etcd/ssl/server.pem --key-file=/opt/etcd/ssl/server-key.pem \
--endpoints="https://10.211.55.10:2379,https://10.211.55.12:2379,https://10.211.55.13:2379" \
ls /coreos.com/network/
```

```bash
[k8s@k8s-master01 ~]$ sudo /opt/etcd/bin/etcdctl \
> --ca-file=/opt/etcd/ssl/ca.pem --cert-file=/opt/etcd/ssl/server.pem --key-file=/opt/etcd/ssl/server-key.pem \
> --endpoints="https://10.211.55.10:2379,https://10.211.55.12:2379,https://10.211.55.13:2379" \
> ls /coreos.com/network/
[sudo] password for k8s: 
/coreos.com/network/config
/coreos.com/network/subnets
[k8s@k8s-master01 ~]$ sudo /opt/etcd/bin/etcdctl --ca-file=/opt/etcd/ssl/ca.pem --cert-file=/opt/etcd/ssl/server.pem --key-file=/opt/etcd/ssl/server-key.pem --endpoints="https://10.211.55.10:2379,https://10.211.55.12:2379,https://10.211.55.13:2379" ls /coreos.com/network/subnets
/coreos.com/network/subnets/172.17.40.0-24
/coreos.com/network/subnets/172.17.68.0-24
[k8s@k8s-master01 ~]$ sudo /opt/etcd/bin/etcdctl --ca-file=/opt/etcd/ssl/ca.pem --cert-file=/opt/etcd/ssl/server.pem --key-file=/opt/etcd/ssl/server-key.pem --endpoints="https://10.211.55.10:2379,https://10.211.55.12:2379,https://10.211.55.13:2379" get /coreos.com/network/subnets/172.17.40.0-24  
{"PublicIP":"10.211.55.13","BackendType":"host-gw"}
```

这个子网分配到哪个ip，所以 flannel 在转发数据之前是需要访问 etcd 中的目标 ip

### <a name="serial"></a>kubernetes二进制部署系列

1. [k8s部署-Etcd数据库集群部署](http://custer.me/etcd-bin-install/)
2. [k8s部署-Flannel网络](http://custer.me/flannel-bin-install/)
3. [k8s部署-Master组件](http://custer.me/kube-master/)
4. [k8s部署-Node组件](http://custer.me/kube-node/)
5. [k8s部署-多Master集群](http://custer.me/multi-master/)
