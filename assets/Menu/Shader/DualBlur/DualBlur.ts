import DualBlurSprite from "./DualBlurSprite";

const {ccclass, property} = cc._decorator;

/**
 * 基于 RenderTexture 实现多 Pass：https://forum.cocos.org/t/topic/126481
 * Dual Kawase Blur （双重模糊）教程地址： https://github.com/QianMo/X-PostProcessing-Library/tree/master/Assets/X-PostProcessing/Effects/DualKawaseBlur
 * 高品质后处理：十种故障艺术(Glitch Art)算法的总结与实现：https://zhuanlan.zhihu.com/p/148256756
 */
@ccclass
export default class DualBlur extends cc.Component {

    @property(cc.Sprite)
    sprite: cc.Sprite = null;

    @property(cc.Material)
    materialDown: cc.Material = null;

    @property(cc.Material)
    materialUp: cc.Material = null;

    @property
    iteration: number = 4;

    /**
     * 正在使用的 RenderTexture
     */
    protected renderTexture: cc.RenderTexture = null;

    start () {
        // 设置目标结点
        const sprite = this.sprite,
            node = this.sprite.node;
        // 设置材质
        const material = this.materialDown;
        this.materialDown.setProperty('resolution', cc.v2(node.width, node.height));
        this.materialUp.setProperty('resolution', cc.v2(node.width, node.height));
        // 创建临时 RenderTexture
        let srcRT = new cc.RenderTexture(),
            lastRT = new cc.RenderTexture();
        // 获取初始 RenderTexture
        this.getRenderTexture(node, lastRT);
        const baseSize: cc.Size = cc.size(lastRT.width, lastRT.height);
        // 多 Pass 处理
        // 注：由于 OpenGL 中的纹理是倒置的，所以双数 Pass 的出的图像是颠倒的
        
        // 记录升降纹理时纹理尺寸
        let pyramid: [number, number][] = [], tw: number = lastRT.width, th: number = lastRT.height;
        //Downsample
        for(let i = 0; i < this.iteration; i++) {
            pyramid.push([tw, th]);
            [lastRT, srcRT] = [srcRT, lastRT];
            this.renderWithMaterial(srcRT, lastRT, this.materialDown, cc.size(tw, th));
            tw = Math.max(tw / 2, 1), th = Math.max(th / 2, 1);
        }
        // Upsample
        for(let i = this.iteration - 2; i >= 0; i--) {
            // pass次数过多导致图片尺寸过大
            [lastRT, srcRT] = [srcRT, lastRT];
            this.renderWithMaterial(srcRT, lastRT, this.materialUp, cc.size(pyramid[i][0], pyramid[i][1]));
        }
        // 最后一个 Upsample
        if(this.iteration > 0) {
            [lastRT, srcRT] = [srcRT, lastRT];
            this.renderWithMaterial(srcRT, lastRT, this.materialUp);
        }
        // 使用经过处理的 RenderTexture
        this.renderTexture = lastRT;
        sprite.spriteFrame = new cc.SpriteFrame(this.renderTexture);
        // 翻转纹理y轴
        sprite.spriteFrame.setFlipY(true);
        // 销毁不用的临时 RenderTexture
        srcRT.destroy();
    }

    /**
     * 获取节点的 RenderTexture
     * @param node 节点
     * @param out 输出
     * @see RenderUtil.ts https://gitee.com/ifaswind/eazax-ccc/blob/master/utils/RenderUtil.ts
     */
     protected getRenderTexture(node: cc.Node, out?: cc.RenderTexture) {
        // 检查参数
        if (!cc.isValid(node)) {
            return null;
        }
        if (!out || !(out instanceof cc.RenderTexture)) {
            out = new cc.RenderTexture();
        }
        // 获取宽高
        const width = Math.floor(node.width),
            height = Math.floor(node.height);
        // 初始化 RenderTexture
        out.initWithSize(width, height);
        // 创建临时摄像机用于渲染目标节点
        const cameraNode = new cc.Node();
        cameraNode.parent = node;
        const camera = cameraNode.addComponent(cc.Camera);
        camera.clearFlags |= cc.Camera.ClearFlags.COLOR;
        camera.backgroundColor = cc.color(0, 0, 0, 0);
        camera.zoomRatio = 1 / node.scale;
        camera.zoomRatio = cc.winSize.height / height / node.scale;
        // 将节点渲染到 RenderTexture 中
        camera.targetTexture = out;
        camera.render(node);
        // 销毁临时对象
        cameraNode.destroy();
        // 返回 RenderTexture
        return out;
    }

    /**
     * 使用指定材质来将 RenderTexture 渲染到另一个 RenderTexture
     * @param srcRT 来源
     * @param dstRT 目标
     * @param material 材质
     * @param size RenderTexture尺寸缩放比例
     * @see RenderUtil.ts https://gitee.com/ifaswind/eazax-ccc/blob/master/utils/RenderUtil.ts
     */
     protected renderWithMaterial(srcRT: cc.RenderTexture, dstRT: cc.RenderTexture | cc.Material, material?: cc.Material, size?: cc.Size) {
        // 检查参数
        if (dstRT instanceof cc.Material) {
            material = dstRT;
            dstRT = new cc.RenderTexture();
        }
        // 创建临时节点（用于渲染 RenderTexture）
        const tempNode = new cc.Node();
        tempNode.setParent(cc.Canvas.instance.node);
        const tempSprite = tempNode.addComponent(DualBlurSprite);
        tempSprite.sizeMode = cc.Sprite.SizeMode.RAW;
        tempSprite.trim = false;
        tempSprite.spriteFrame = new cc.SpriteFrame(srcRT);
        // 获取图像宽高
        const { width, height } = size ?? { width: srcRT.width, height: srcRT.height };
        // 初始化 RenderTexture
        dstRT.initWithSize(width, height);
        // 更新材质
        if (material instanceof cc.Material) {
            tempSprite.setMaterial(0, material);
        }
        // 创建临时摄像机（用于渲染临时节点）
        const cameraNode = new cc.Node();
        cameraNode.setParent(tempNode);
        const camera = cameraNode.addComponent(cc.Camera);
        camera.clearFlags |= cc.Camera.ClearFlags.COLOR;
        camera.backgroundColor = cc.color(0, 0, 0, 0);
        // 根据屏幕适配方案，决定摄像机缩放比
        // 还原sizeScale，zoomRatio取屏幕与RT宽高比
        camera.zoomRatio = cc.winSize.height / srcRT.height;
        // 将临时节点渲染到 RenderTexture 中
        camera.targetTexture = dstRT;
        camera.render(tempNode);
        // 销毁临时对象
        cameraNode.destroy();
        tempNode.destroy();
        // 返回 RenderTexture
        return dstRT;
    }

}
