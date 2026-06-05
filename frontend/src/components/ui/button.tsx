import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
//cva(): định nghĩa toàn bộ style
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        outline: 'border border-border bg-background hover:bg-secondary hover:text-secondary-foreground',
        ghost: 'hover:bg-secondary hover:text-secondary-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,  // ① kế thừa mọi prop HTML button (onClick, disabled, type...)
    VariantProps<typeof buttonVariants> {                 // ② thêm prop variant và size từ cva
  asChild?: boolean;                                      // ③ prop đặc biệt, giải thích dưới
}

function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };

/*
asChild = false (bình thường):


<Button>Lưu CV</Button>
// render ra: <button class="...style...">Lưu CV</button>
asChild = true — dùng khi button cần là link:


<Button asChild>
  <a href="/dashboard">Vào Dashboard</a>
</Button>
// render ra: <a href="/dashboard" class="...style...">Vào Dashboard</a>
//            ↑ là thẻ <a>, không phải <button>, nhưng mang style của Button
Slot từ Radix "ghép" style của Button vào element con (<a>) thay vì tạo <button> mới. Dùng khi bạn cần button trông như button nhưng thực ra là link (SEO, accessibility).

cn(...) ghép lại: "inline-flex ... bg-primary h-10 px-4 mt-4"


// cva → tính ra string class theo variant/size
// clsx → gộp string đó với className prop bên ngoài, bỏ falsy
// twMerge → resolve conflict nếu className bên ngoài override class của cva
//   ↑ 3 cái này gộp lại trong cn() ở utils.ts

// Slot → cho phép asChild pattern
const Comp = asChild ? Slot : 'button';
return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
//                     ↑ cva          ↑ clsx + twMerge (qua cn)


còn chỗ này là sao     <Comp
asChild = false            asChild = true
     ↓                          ↓
Comp = 'button'           Comp = Slot
     ↓                          ↓
<button class="...">      <Slot class="...">
  Lưu CV                    <a href="...">Lưu CV</a>
</button>               </Slot>
                              ↓ Slot "hòa tan"
                        <a href="..." class="...">Lưu CV</a>
*/